import hardhat from "hardhat";
import fs from "fs";
import path from "path";
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  // Get the list of accounts provided by the Hardhat network
  const [deployer] = await hardhat.ethers.getSigners();

  console.log("Starting deployment...");
  console.log(`Using account: ${deployer.address} as the main Admin/Insurer`);

  // 1. Deploy the new CyberToken FIRST
  const CyberToken = await hardhat.ethers.getContractFactory("CyberToken");
  const cyberToken = await CyberToken.deploy(hardhat.ethers.parseEther("1000000")); // 1 Million CIT
  await cyberToken.waitForDeployment();
  const tokenAddress = await cyberToken.getAddress();
  console.log(`✅ CyberToken deployed to: ${tokenAddress}`);

  // 2. Deploy existing contracts
  const PolicyEngine = await hardhat.ethers.getContractFactory("PolicyEngine");
  const policyEngine = await PolicyEngine.deploy();
  await policyEngine.waitForDeployment();
  const policyAddress = await policyEngine.getAddress();
  console.log(`✅ PolicyEngine deployed to: ${policyAddress}`);

  const PostureRegistry = await hardhat.ethers.getContractFactory("PostureRegistry");
  const postureRegistry = await PostureRegistry.deploy();
  await postureRegistry.waitForDeployment();
  const postureAddress = await postureRegistry.getAddress();
  console.log(`✅ PostureRegistry deployed to: ${postureAddress}`);

  const AuditRegistry = await hardhat.ethers.getContractFactory("AuditRegistry");
  const auditRegistry = await AuditRegistry.deploy();
  await auditRegistry.waitForDeployment();
  const auditAddress = await auditRegistry.getAddress();
  console.log(`✅ AuditRegistry deployed to: ${auditAddress}`);

  const Governance = await hardhat.ethers.getContractFactory("Governance");
  const governance = await Governance.deploy(auditAddress);
  await governance.waitForDeployment();
  const govAddress = await governance.getAddress();
  console.log(`✅ Governance deployed to: ${govAddress}`);

  // 3. Deploy ClaimsProcessor with all THREE arguments
  const ClaimsProcessor = await hardhat.ethers.getContractFactory("ClaimsProcessor");
  const claimsProcessor = await ClaimsProcessor.deploy(postureAddress, policyAddress, tokenAddress);
  await claimsProcessor.waitForDeployment();
  const claimsAddress = await claimsProcessor.getAddress();
  console.log(`✅ ClaimsProcessor deployed to: ${claimsAddress}`);

  // 4. Fund the ClaimsProcessor with 50,000 CIT so it can pay claims
  console.log("Funding ClaimsProcessor with 50,000 CIT...");
  await cyberToken.transfer(claimsAddress, hardhat.ethers.parseEther("50000"));

  // 5. Write addresses to deployed_addresses.json
  const addresses = {
    CyberToken: tokenAddress,
    AuditRegistry: auditAddress,
    Governance: govAddress,
    PostureRegistry: postureAddress,
    PolicyEngine: policyAddress,
    ClaimsProcessor: claimsAddress
  };

  const outputPath = path.join(__dirname, "..", "backend", "deployed_addresses.json");
  fs.writeFileSync(outputPath, JSON.stringify(addresses, null, 2));
  console.log(`Addresses saved to ${outputPath}`);

  // 6. Update .env
  let envContent = fs.readFileSync(".env", "utf8");
  envContent = envContent.replace(/AUDIT_REGISTRY_ADDRESS=.*/, `AUDIT_REGISTRY_ADDRESS=${auditAddress}`);
  envContent = envContent.replace(/GOVERNANCE_ADDRESS=.*/, `GOVERNANCE_ADDRESS=${govAddress}`);
  envContent = envContent.replace(/POSTURE_REGISTRY_ADDRESS=.*/, `POSTURE_REGISTRY_ADDRESS=${postureAddress}`);
  envContent = envContent.replace(/POLICY_ENGINE_ADDRESS=.*/, `POLICY_ENGINE_ADDRESS=${policyAddress}`);
  envContent = envContent.replace(/CLAIMS_PROCESSOR_ADDRESS=.*/, `CLAIMS_PROCESSOR_ADDRESS=${claimsAddress}`);

  if (envContent.includes('CYBER_TOKEN_ADDRESS')) {
    envContent = envContent.replace(/CYBER_TOKEN_ADDRESS=.*/, `CYBER_TOKEN_ADDRESS=${tokenAddress}`);
  } else {
    envContent += `\nCYBER_TOKEN_ADDRESS=${tokenAddress}`;
  }
  fs.writeFileSync(".env", envContent);
  console.log("Successfully updated .env and deployed_addresses.json");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});