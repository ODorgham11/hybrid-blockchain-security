import hardhat from "hardhat";
import fs from "fs";
import path from "path";
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
    console.log("--- Seeding Audit Trail & Governance Test Data ---\n");

    const addressesPath = path.join(__dirname, "..", "backend", "deployed_addresses.json");
    const addresses = JSON.parse(fs.readFileSync(addressesPath, "utf8"));

    const [deployer, company] = await hardhat.ethers.getSigners();
    const { ethers } = hardhat;

    // ── AuditRegistry ──────────────────────────────────────────────────
    const auditRegistry = await ethers.getContractAt("AuditRegistry", addresses.AuditRegistry);

    const auditEntries = [
        {
            instruction: "Monitor port 80 for malicious traffic",
            context: "Normal traffic baseline detected",
            reasoning: "No anomalies found in last 60 minutes",
            action: "LOG - No action required",
            risk: 0  // LOW
        },
        {
            instruction: "Analyze login attempts",
            context: "2 failed logins from 192.168.1.50",
            reasoning: "Below threshold (5 attempts), possible typo",
            action: "WARN - Monitor and flag IP",
            risk: 1  // MEDIUM
        },
        {
            instruction: "Respond to anomalous payload on port 443",
            context: "3 failed logins + SQL keywords in payload",
            reasoning: "Pattern matches known SQL injection signature",
            action: "BLOCK - IP 192.168.1.50 blacklisted",
            risk: 2  // HIGH
        },
        {
            instruction: "Detect and respond to data exfiltration",
            context: "500MB outbound to unknown IP at 3AM",
            reasoning: "Exceeds normal threshold by 20x, matches C2 signature",
            action: "ISOLATE - Endpoint quarantined, SOC alerted",
            risk: 3  // CRITICAL
        },
        {
            instruction: "Verify patch compliance status",
            context: "CVE-2026-1234 patch available for 72 hours",
            reasoning: "System unpatched beyond 48h SLA, non-compliant",
            action: "FLAG - Non-compliance recorded for SHS",
            risk: 2  // HIGH
        }
    ];

    console.log(`Logging ${auditEntries.length} AI actions to AuditRegistry...`);
    for (let i = 0; i < auditEntries.length; i++) {
        const e = auditEntries[i];
        const riskLabels = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];

        const tx = await auditRegistry.connect(deployer).logAction(
            ethers.encodeBytes32String(e.instruction.substring(0, 31)),
            ethers.encodeBytes32String(e.context.substring(0, 31)),
            ethers.encodeBytes32String(e.reasoning.substring(0, 31)),
            ethers.encodeBytes32String(e.action.substring(0, 31)),
            e.risk
        );
        await tx.wait();
        console.log(`  ✅ Entry #${i}: [${riskLabels[e.risk]}] ${e.action.substring(0, 50)}`);
    }

    // ── DailyReportRegistry ────────────────────────────────────────────
    const dailyRegistry = await ethers.getContractAt("DailyReportRegistry", addresses.DailyReportRegistry);

    const dailyReports = [
        { hash: "daily-report-day-0-sha256", totalActions: 12, avgRisk: 1 }, // MEDIUM
        { hash: "daily-report-day-1-sha256", totalActions: 8, avgRisk: 0 }, // LOW
        { hash: "daily-report-day-2-sha256", totalActions: 19, avgRisk: 2 }, // HIGH
    ];

    console.log(`\nSubmitting ${dailyReports.length} daily reports to DailyReportRegistry...`);
    for (let i = 0; i < dailyReports.length; i++) {
        const r = dailyReports[i];
        const tx = await dailyRegistry.connect(deployer).submitDailyReport(
            ethers.encodeBytes32String(r.hash.substring(0, 31)),
            r.totalActions,
            r.avgRisk
        );
        await tx.wait();
        const riskLabels = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
        console.log(`  ✅ Day ${i}: ${r.totalActions} actions, avg risk: ${riskLabels[r.avgRisk]}`);
    }

    // ── PostureRegistry ─────────────────────────────────────────────────
    const postureRegistry = await ethers.getContractAt("PostureRegistry", addresses.PostureRegistry);

    console.log(`\nRecording 3 posture snapshots for ${company.address}...`);
    const scores = [92, 88, 95];
    for (const score of scores) {
        const tx = await postureRegistry.connect(company).recordSnapshot(
            ethers.encodeBytes32String(`snapshot-score-${score}`),
            score
        );
        await tx.wait();
        console.log(`  ✅ Snapshot recorded: score=${score}`);
    }

    console.log("\n✅ All test data seeded! You can now test:");
    console.log("   - Admin → Audit Trail (5 entries: 2×LOW/MED, 3×HIGH/CRITICAL with governance buttons)");
    console.log("   - Admin → Chain Explorer Panel A (AI reasoning cards)");
    console.log("   - Admin → Chain Explorer Panel B (3 daily reports)");
    console.log("   - Admin → Chain Explorer Panel C (verify posture for", company.address, ")");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
