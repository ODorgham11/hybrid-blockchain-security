import hardhat from "hardhat";
import fs from "fs";
import path from "path";
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
    console.log("--- Setting Up Test Data for Frontend ---");
    
    // Load addresses
    const addressesPath = path.join(__dirname, "..", "backend", "deployed_addresses.json");
    const addresses = JSON.parse(fs.readFileSync(addressesPath, "utf8"));
    
    const [deployer, company] = await hardhat.ethers.getSigners();
    console.log(`Insurer (Deployer): ${deployer.address}`);
    console.log(`Company (Client): ${company.address}`);

    // 1. Set Active Policy
    const PolicyEngine = await hardhat.ethers.getContractFactory("PolicyEngine");
    const policyEngine = await PolicyEngine.attach(addresses.PolicyEngine);
    
    console.log(`\nSetting active policy for ${company.address}...`);
    let tx = await policyEngine.connect(deployer).setPolicy(
        company.address, 
        ["Firewall"], 
        [true], 
        [0], 
        [100]
    );
    await tx.wait();
    console.log("✅ Policy set successfully.");

    // 2. Set Compliant Security Posture
    const PostureRegistry = await hardhat.ethers.getContractFactory("PostureRegistry");
    const postureRegistry = await PostureRegistry.attach(addresses.PostureRegistry);

    console.log(`\nRecording compliant posture score (94 SHS) for ${company.address}...`);
    tx = await postureRegistry.connect(company).recordSnapshot(
        hardhat.ethers.encodeBytes32String("daily-snapshot"),
        94
    );
    await tx.wait();
    console.log("✅ Posture recorded successfully.");

    console.log("\n✅ Test data setup complete! You can now file a claim on the frontend.");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
