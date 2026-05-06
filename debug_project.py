import os
import json
import re

def check_sync():
    print("====================================================")
    print("🔍  BLOCKCHAIN PROJECT ARCHITECT: SYNC DIAGNOSTICS")
    print("====================================================\n")
    
    # 1. Check deployed_addresses.json
    addr_path = "backend/deployed_addresses.json"
    deployed_addr = {}
    if os.path.exists(addr_path):
        try:
            with open(addr_path, "r", encoding="utf-8") as f:
                deployed_addr = json.load(f)
                print(f"✅ Found deployed_addresses.json")
        except Exception as e:
            print(f"❌ Error reading deployed_addresses.json: {e}")
    else:
        print(f"❌ CRITICAL MISSING: {addr_path}")

    # 2. Check .env
    env_vars = {}
    if os.path.exists(".env"):
        try:
            with open(".env", "r", encoding="utf-8") as f:
                for line in f:
                    if "=" in line:
                        parts = line.strip().split("=", 1)
                        if len(parts) == 2:
                            env_vars[parts[0]] = parts[1]
            print(f"✅ Found .env")
        except Exception as e:
            print(f"❌ Error reading .env: {e}")
    else:
        print(f"❌ MISSING: .env (Script might fail to find contract variables)")

    # 3. Check App.jsx for the ClaimsProcessor address
    app_jsx_path = "frontend/src/App.jsx"
    app_address = None
    if os.path.exists(app_jsx_path):
        try:
            with open(app_jsx_path, "r", encoding="utf-8") as f:
                content = f.read()
                # Regex to find CLAIMS_PROCESSOR_ADDRESS = "0x..."
                match = re.search(r'CLAIMS_PROCESSOR_ADDRESS\s*=\s*"(0x[a-fA-F0-9]{40})"', content)
                if match:
                    app_address = match.group(1)
            print(f"✅ Found App.jsx")
        except Exception as e:
            print(f"❌ Error reading App.jsx: {e}")
    else:
        print(f"❌ MISSING: {app_jsx_path}")

    print("\n" + "="*20 + " RESULTS " + "="*20)
    
    # Validation Logic
    claims_deployed = deployed_addr.get("ClaimsProcessor")
    claims_env = env_vars.get("CLAIMS_PROCESSOR_ADDRESS")
    
    sync_ok = True
    if not claims_deployed:
        print("❌ ERROR: No ClaimsProcessor found in deployed_addresses.json. Did you run deploy.js?")
        sync_ok = False
    
    if claims_deployed and claims_env and claims_deployed.lower() != claims_env.lower():
        print(f"🔴 MISMATCH: .env address ({claims_env}) != Deployed address ({claims_deployed})")
        sync_ok = False
        
    if claims_deployed and app_address and claims_deployed.lower() != app_address.lower():
        print(f"🔴 MISMATCH: App.jsx address ({app_address}) != Deployed address ({claims_deployed})")
        sync_ok = False

    if sync_ok and app_address:
        print("🟢 SUCCESS: All system addresses are in sync!")
        print(f"   Active ClaimsProcessor: {app_address}")
    elif not app_address:
        print("❌ ERROR: Could not find 'CLAIMS_PROCESSOR_ADDRESS' variable in App.jsx.")
    else:
        print("\n👉 ACTION REQUIRED: Update your files so all addresses match the 'deployed_addresses.json' value.")

    # Check Policy Address in setup-policy.js
    policy_script = "scripts/setup-policy.js"
    if os.path.exists(policy_script):
        try:
            with open(policy_script, "r", encoding="utf-8") as f:
                content = f.read()
                match = re.search(r'companyWallet\s*=\s*"(0x[a-fA-F0-9]{40})"', content)
                if match:
                    target_wallet = match.group(1)
                    print(f"\nℹ️ setup-policy.js is targeting: {target_wallet}")
                    print("   Ensure this matches the 'Connected as:' address in your browser header!")
        except Exception as e:
            print(f"❌ Error reading setup-policy.js: {e}")

    print("\n" + "="*50)
    print("🚨 NETWORK CRITICAL CHECK (Based on your screenshot):")
    print("1. Open MetaMask. Look at the network selector (top-left).")
    print("2. It MUST say your local network name (e.g., 'Hardhat Local' or 'Localhost 8545').")
    print("3. If it says 'Ethereum', your claim WILL FAIL because the contract doesn't exist there.")
    print("\nFINAL STEPS:")
    print("1. Switch MetaMask to your Localhost network (Chain ID 1337 or 31337).")
    print("2. Hard-refresh the browser tab (Ctrl+F5).")
    print("3. Try filing the claim again.")
    print("====================================================")

if __name__ == "__main__":
    check_sync()