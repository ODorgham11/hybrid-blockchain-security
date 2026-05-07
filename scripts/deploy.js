import hardhat from "hardhat";
import fs from "fs";
import path from "path";
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  const [deployer] = await hardhat.ethers.getSigners();

  console.log("Starting deployment...");
  console.log(`Using account: ${deployer.address} as the main Admin/Insurer`);

  // 1. Deploy CyberToken (CIT)
  const CyberToken = await hardhat.ethers.getContractFactory("CyberToken");
  const cyberToken = await CyberToken.deploy(hardhat.ethers.parseEther("1000000"));
  await cyberToken.waitForDeployment();
  const tokenAddress = await cyberToken.getAddress();
  console.log(`✅ CyberToken deployed to: ${tokenAddress}`);

  // 2. Deploy infrastructure
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

  // 3. Deploy ClaimsProcessor with FOUR arguments
  console.log("Deploying ClaimsProcessor with 4 dependencies...");
  const ClaimsProcessor = await hardhat.ethers.getContractFactory("ClaimsProcessor");
  const claimsProcessor = await ClaimsProcessor.deploy(
    postureAddress,
    policyAddress,
    tokenAddress,
    auditAddress
  );
  await claimsProcessor.waitForDeployment();
  const claimsAddress = await claimsProcessor.getAddress();
  console.log(`✅ ClaimsProcessor deployed to: ${claimsAddress}`);

  // 4. Deploy DailyReportRegistry
  console.log("Deploying DailyReportRegistry...");
  const DailyReportRegistry = await hardhat.ethers.getContractFactory("DailyReportRegistry");
  const dailyReportRegistry = await DailyReportRegistry.deploy();
  await dailyReportRegistry.waitForDeployment();
  const dailyReportAddress = await dailyReportRegistry.getAddress();
  console.log(`✅ DailyReportRegistry deployed to: ${dailyReportAddress}`);

  // 5. Fund the ClaimsProcessor
  console.log("Funding ClaimsProcessor with 50,000 CIT...");
  await cyberToken.transfer(claimsAddress, hardhat.ethers.parseEther("50000"));

  // 6. Save addresses
  const addresses = {
    CyberToken: tokenAddress,
    AuditRegistry: auditAddress,
    Governance: govAddress,
    PostureRegistry: postureAddress,
    PolicyEngine: policyAddress,
    ClaimsProcessor: claimsAddress,
    DailyReportRegistry: dailyReportAddress
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
  envContent = envContent.replace(/CYBER_TOKEN_ADDRESS=.*/, `CYBER_TOKEN_ADDRESS=${tokenAddress}`);
  fs.writeFileSync(".env", envContent);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});