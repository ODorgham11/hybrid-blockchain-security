import sys
from pathlib import Path

# Add backend to path
sys.path.append(str(Path(__file__).parent))

from agents.security_agent import SecurityAgent
from agents.anomaly_detector import AnomalyDetector
from agents.fraud_analyzer import FraudAnalyzer
import blockchain

def run_all_tests():
    print("========================================")
    print("HYBRID BLOCKCHAIN SYSTEM TEST RUN")
    print("========================================")

    # 1. Test Blockchain Connection
    print("\n[1] Testing Blockchain Connection...")
    if not blockchain.w3.is_connected():
        print("[FAIL] Web3 is not connected! Is the Hardhat node running?")
        print("Run: npx hardhat node")
        return
    print("[SUCCESS] Web3 Connected successfully to Local Hardhat Node.")

    # Initialize AI Agents
    print("\n[2] Initializing AI Agents (Connecting to Gemini)...")
    sec_agent = SecurityAgent()
    anom_detector = AnomalyDetector()
    fraud_analyzer = FraudAnalyzer()
    print("[SUCCESS] AI Agents Initialized.")

    # 3. Test Security Agent
    print("\n[3] Testing Security Agent...")
    alert = "Detected lateral movement via WMI from HR desktop to Domain Controller."
    context = "HR desktop shouldn't have admin access. WMI activity is highly suspicious."
    sec_result = sec_agent.handle_alert(alert, context)
    if sec_result.get("success"):
        print("[SUCCESS] Security Agent Success!")
        print(f"   -> Action: {sec_result.get('action')}")
        print(f"   -> Risk Level: {sec_result.get('risk_level')}")
        print(f"   -> Blockchain Entry ID: {sec_result.get('entry_id')}")
    else:
        print(f"[FAIL] Security Agent Failed: {sec_result.get('error')}")

    # 4. Test Anomaly Detector
    print("\n[4] Testing Anomaly Detector...")
    logs = '{"22:00": "admin login", "22:05": "firewall rules modified", "22:10": "large data export to unknown IP"}'
    anom_result = anom_detector.analyze_daily_logs(logs)
    if "error" not in anom_result:
        print("[SUCCESS] Anomaly Detector Success!")
        print(f"   -> Anomaly Found: {anom_result.get('anomaly_detected')}")
        print(f"   -> Recommended Action: {anom_result.get('recommended_action')}")
        if "entry_id" in anom_result:
             print(f"   -> Blockchain Entry ID: {anom_result.get('entry_id')}")
    else:
        print(f"[FAIL] Anomaly Detector Failed: {anom_result.get('error')}")

    # 5. Test Fraud Analyzer
    print("\n[5] Testing Fraud Analyzer...")
    claim_id = 99
    claim_data = "Ransomware locked all customer data. Requesting $5M payout. We had state-of-the-art security."
    posture = "Security Score: 30/100. Backups were deleted 5 months ago. Default passwords in use."
    fraud_result = fraud_analyzer.analyze_claim(claim_id, claim_data, posture)
    if "error" not in fraud_result:
        print("[SUCCESS] Fraud Analyzer Success!")
        print(f"   -> Fraud Score: {fraud_result.get('fraud_score')}%")
        print(f"   -> Blockchain TX Hash: {fraud_result.get('tx_hash')}")
    else:
        print(f"[FAIL] Fraud Analyzer Failed: {fraud_result.get('error')}")

    print("\n========================================")
    print("ALL TESTS COMPLETED!")
    print("========================================")

if __name__ == "__main__":
    run_all_tests()
