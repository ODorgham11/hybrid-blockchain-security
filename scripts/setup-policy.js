import hardhat from "hardhat";
import dotenv from "dotenv";
dotenv.config();

async function main() {
    // 1. Get the PolicyEngine contract
    const policyAddress = process.env.POLICY_ENGINE_ADDRESS;
    const PolicyEngine = await hardhat.ethers.getContractAt("PolicyEngine", policyAddress);

    // 2. Paste your MetaMask wallet address here!
    // (Copy it from your MetaMask extension)
    const companyWallet = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";

    console.log(`Setting up insurance policy for: ${companyWallet}`);

    // 3. Set the policy (Simulating the Insurer)
    const tx = await PolicyEngine.setPolicy(
        companyWallet,
        ["Firewall Active", "MFA Enforced"], // Rule names
        [true, true],                        // Required flags
        [86400, 86400],                      // Max age (1 day)
        [50, 50]                             // Weights
    );

    await tx.wait();

    const isActive = await PolicyEngine.isPolicyActive(companyWallet);
    console.log(`Policy active status: ${isActive} ✅`);
    console.log("You can now file a claim from your browser!");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});