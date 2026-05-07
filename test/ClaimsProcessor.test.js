import { expect } from "chai";
import hardhat from "hardhat";
const { ethers } = hardhat;

describe("ClaimsProcessor Integration Tests", function () {
    let claimsProcessor, postureRegistry, policyEngine, cyberToken, auditRegistry;
    let owner, company, insurer;

    beforeEach(async function () {
        [owner, company, insurer] = await ethers.getSigners();

        // Deploy all contracts
        const PolicyEngine = await ethers.getContractFactory("PolicyEngine");
        policyEngine = await PolicyEngine.deploy();

        const PostureRegistry = await ethers.getContractFactory("PostureRegistry");
        postureRegistry = await PostureRegistry.deploy();

        const AuditRegistry = await ethers.getContractFactory("AuditRegistry");
        auditRegistry = await AuditRegistry.deploy();

        const CyberToken = await ethers.getContractFactory("CyberToken");
        cyberToken = await CyberToken.deploy(ethers.parseEther("1000000"));

        const ClaimsProcessor = await ethers.getContractFactory("ClaimsProcessor");
        claimsProcessor = await ClaimsProcessor.deploy(
            await postureRegistry.getAddress(),
            await policyEngine.getAddress(),
            await cyberToken.getAddress(),
            await auditRegistry.getAddress()
        );

        // Fund ClaimsProcessor with 50,000 tokens
        await cyberToken.transfer(await claimsProcessor.getAddress(), ethers.parseEther("50000"));

        // Set active policy for the company so they can file claims
        await policyEngine.setPolicy(company.address, ["Firewall"], [true], [0], [100]);
    });

    describe("Test 1: Happy Path - Fully Compliant Company", function () {
        it("Should approve claim and pay full amount for compliant company", async function () {
            // 1. Set up compliant posture snapshot
            await postureRegistry.connect(company).recordSnapshot(ethers.encodeBytes32String("hash"), 100);

            // 2. File a claim
            const breachTime = (await ethers.provider.getBlock("latest")).timestamp;
            const claimAmount = ethers.parseEther("1000");
            await claimsProcessor.connect(company).fileClaim(breachTime, "Ransomware", claimAmount);
            
            // 3. Process claim
            await claimsProcessor.recordFraudScore(0, 10, ethers.encodeBytes32String("fraudReport"));
            await claimsProcessor.processClaim(0);

            // 4. Assert: claim status = APPROVED, payout > 0
            const claim = await claimsProcessor.getClaim(0);
            expect(claim.verdict).to.equal(1); // 1 = APPROVED
            expect(claim.payoutPercentage).to.equal(100);

            const balance = await cyberToken.balanceOf(company.address);
            expect(balance).to.equal(claimAmount);
        });
    });

    describe("Test 2: Edge Case - Partially Compliant Company", function () {
        it("Should approve claim with pro-rated payout", async function () {
            // 1. Set up 66% compliant posture
            await postureRegistry.connect(company).recordSnapshot(ethers.encodeBytes32String("hash"), 66);

            // 2. File a claim
            const breachTime = (await ethers.provider.getBlock("latest")).timestamp;
            const claimAmount = ethers.parseEther("1000");
            await claimsProcessor.connect(company).fileClaim(breachTime, "Ransomware", claimAmount);

            // 3. Process claim
            await claimsProcessor.recordFraudScore(0, 10, ethers.encodeBytes32String("fraudReport"));
            await claimsProcessor.processClaim(0);

            // 4. Assert: claim status = PARTIAL, payout = baseAmount * 0.66
            const claim = await claimsProcessor.getClaim(0);
            expect(claim.verdict).to.equal(2); // 2 = PARTIAL
            expect(claim.payoutPercentage).to.equal(66);

            const balance = await cyberToken.balanceOf(company.address);
            const expectedPayout = (claimAmount * 66n) / 100n;
            expect(balance).to.equal(expectedPayout);
        });
    });

    describe("Test 3: Edge Case - Non-Compliant Company", function () {
        it("Should deny claim for non-compliant company", async function () {
            // 1. Set up non-compliant posture (0 checks pass)
            await postureRegistry.connect(company).recordSnapshot(ethers.encodeBytes32String("hash"), 0);

            // 2. File a claim
            const breachTime = (await ethers.provider.getBlock("latest")).timestamp;
            const claimAmount = ethers.parseEther("1000");
            await claimsProcessor.connect(company).fileClaim(breachTime, "Ransomware", claimAmount);

            // 3. Process claim
            await claimsProcessor.recordFraudScore(0, 10, ethers.encodeBytes32String("fraudReport"));
            await claimsProcessor.processClaim(0);

            // 4. Assert: claim status = DENIED, payout = 0
            const claim = await claimsProcessor.getClaim(0);
            expect(claim.verdict).to.equal(3); // 3 = DENIED
            expect(claim.payoutPercentage).to.equal(0);

            const balance = await cyberToken.balanceOf(company.address);
            expect(balance).to.equal(0n);
        });
    });

    describe("Test 4: Security - Reentrancy Attack", function () {
        it("Should block reentrancy attack on processClaim", async function () {
            // 1. Deploy malicious contract that acts as the backend and the audit registry
            const MaliciousAttacker = await ethers.getContractFactory("MaliciousAttacker");
            const attacker = await MaliciousAttacker.deploy();
            await attacker.waitForDeployment();

            // 2. Attacker deploys a new ClaimsProcessor (attacker becomes the authorized backendSystem)
            // Attacker passes its own address as the AuditRegistry so it can intercept getActionCountByTimeRange
            await attacker.deployTarget(
                await postureRegistry.getAddress(),
                await policyEngine.getAddress(),
                await cyberToken.getAddress()
            );

            const targetAddress = await attacker.targetContract();
            const targetClaimsProcessor = await ethers.getContractAt("ClaimsProcessor", targetAddress);
            
            // Fund the newly deployed ClaimsProcessor so it can theoretically pay claims
            await cyberToken.transfer(targetAddress, ethers.parseEther("50000"));

            // Setup compliant posture
            await postureRegistry.connect(company).recordSnapshot(ethers.encodeBytes32String("hash"), 100);

            // File the claim on the new target processor
            const breachTime = (await ethers.provider.getBlock("latest")).timestamp;
            const claimAmount = ethers.parseEther("1000");
            await targetClaimsProcessor.connect(company).fileClaim(breachTime, "Ransomware", claimAmount);

            // Record fraud score using attacker (since attacker is the backendSystem for the new ClaimsProcessor)
            await attacker.recordFraudScore(0, 10, ethers.encodeBytes32String("fraudReport"));

            // 3. Assert: Transaction reverts with ReentrancyGuard custom error (OZ v5)
            await expect(attacker.attack(0)).to.be.revertedWithCustomError(targetClaimsProcessor, "ReentrancyGuardReentrantCall");
        });
    });
});
