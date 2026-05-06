import hardhat from "hardhat";
import dotenv from "dotenv";
dotenv.config();

async function main() {
  const auditAddress = process.env.AUDIT_REGISTRY_ADDRESS;
  console.log(`Testing connection to AuditRegistry at: ${auditAddress}`);

  // Get the contract instance at the deployed address
  const AuditRegistry = await hardhat.ethers.getContractAt("AuditRegistry", auditAddress);

  // Call a read function (get entryCount)
  const count = await AuditRegistry.entryCount();
  console.log(`✅ Success! The AuditRegistry is alive.`);
  console.log(`Current Entry Count: ${count.toString()}`);
}

main().catch((error) => {
  console.error("❌ Connection failed!");
  console.error(error);
  process.exitCode = 1;
});
