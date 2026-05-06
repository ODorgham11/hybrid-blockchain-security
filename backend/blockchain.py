import json
import os
import logging
from pathlib import Path
from web3 import Web3
from dotenv import load_dotenv

load_dotenv()

# Global state
w3 = Web3(Web3.HTTPProvider(os.getenv("HARDHAT_RPC_URL", "http://127.0.0.1:8545")))
BLOCKCHAIN_AVAILABLE = False
audit_registry = None
governance = None
posture_registry = None
claims_processor = None
policy_engine = None

logger = logging.getLogger("blockchain")

def get_contract_abi(contract_name: str) -> list:
    """Loads the ABI from the Hardhat artifacts folder."""
    base_path = Path(__file__).parent.parent
    artifact_path = base_path / "artifacts" / "contracts" / f"{contract_name}.sol" / f"{contract_name}.json"
    
    if not artifact_path.exists():
        raise FileNotFoundError(f"Could not find artifact for {contract_name} at {artifact_path}. Did you compile?")
        
    with open(artifact_path, "r") as f:
        data = json.load(f)
    return data["abi"]

def init_blockchain():
    global BLOCKCHAIN_AVAILABLE, audit_registry, governance, posture_registry, claims_processor, policy_engine
    
    print("[Blockchain] Connecting to Hardhat node...")
    if not w3.is_connected():
        logger.critical("Could not connect to Web3 provider. Blockchain features disabled.")
        BLOCKCHAIN_AVAILABLE = False
        return

    try:
        w3.eth.default_account = w3.eth.accounts[0]
        
        # Load addresses from deployed_addresses.json
        addr_path = Path(__file__).parent / "deployed_addresses.json"
        if not addr_path.exists():
            raise FileNotFoundError("Run: npx hardhat run scripts/deploy.js first")
            
        with open(addr_path, "r") as f:
            addresses = json.load(f)

        def load_contract(name, key):
            abi = get_contract_abi(name)
            return w3.eth.contract(address=addresses[key], abi=abi)

        audit_registry = load_contract("AuditRegistry", "AuditRegistry")
        governance = load_contract("Governance", "Governance")
        posture_registry = load_contract("PostureRegistry", "PostureRegistry")
        claims_processor = load_contract("ClaimsProcessor", "ClaimsProcessor")
        policy_engine = load_contract("PolicyEngine", "PolicyEngine")
        
        BLOCKCHAIN_AVAILABLE = True
        print("[Blockchain] System initialized successfully.")
    except Exception as e:
        logger.critical(f"Blockchain initialization failed: {e}")
        BLOCKCHAIN_AVAILABLE = False

def log_ai_action(instruction_hash: str, context_hash: str, reasoning_hash: str, action_hash: str, risk_level: int) -> int:
    """Submits AI action hashes to AuditRegistry and returns the entryId."""
    if not BLOCKCHAIN_AVAILABLE or not audit_registry: 
        return -1
    
    try:
        def to_b32(h): return Web3.to_bytes(hexstr=h)
        tx_hash = audit_registry.functions.logAction(
            to_b32(instruction_hash),
            to_b32(context_hash),
            to_b32(reasoning_hash),
            to_b32(action_hash),
            risk_level
        ).transact()
        receipt = w3.eth.wait_for_transaction_receipt(tx_hash)
        logs = audit_registry.events.ActionLogged().process_receipt(receipt)
        return logs[0]['args']['entryId'] if logs else -1
    except Exception as e:
        logger.error(f"log_ai_action failed: {e}")
        return -1

def record_batch_root(merkle_root: str) -> int:
    """Submits a Merkle root for a batch of events to AuditRegistry."""
    if not BLOCKCHAIN_AVAILABLE or not audit_registry: 
        return -1
    
    try:
        tx_hash = audit_registry.functions.recordBatchRoot(
            Web3.to_bytes(hexstr=merkle_root)
        ).transact()
        receipt = w3.eth.wait_for_transaction_receipt(tx_hash)
        logs = audit_registry.events.BatchLogged().process_receipt(receipt)
        return logs[0]['args']['batchId'] if logs else -1
    except Exception as e:
        logger.error(f"record_batch_root failed: {e}")
        return -1

def record_posture_snapshot(merkle_root: str, score: int) -> str:
    """Submits the daily Merkle root to PostureRegistry."""
    if not BLOCKCHAIN_AVAILABLE or not posture_registry: 
        return ""
    
    try:
        tx_hash = posture_registry.functions.recordSnapshot(
            Web3.to_bytes(hexstr=merkle_root),
            score
        ).transact()
        w3.eth.wait_for_transaction_receipt(tx_hash)
        return tx_hash.hex()
    except Exception as e:
        logger.error(f"record_posture_snapshot failed: {e}")
        return ""
