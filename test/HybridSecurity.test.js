import { expect } from "chai";
import hardhat from "hardhat";
const { ethers } = hardhat;

describe("Hybrid Security Architecture & Tokenization", function () {
    let cyberToken, postureRegistry, policyEngine, claimsProcessor;
    let deployer, company, unauthorizedUser;

    before(async function () {
        // Grab mock accounts from Hardhat
        [deployer, company, unauthorizedUser] = await ethers.getSigners();

        // 1. Deploy Cyber Token (1,000,000 CIT)
        const Token = await ethers.getContractFactory("CyberToken");
        cyberToken = await Token.deploy(ethers.parseEther("1000000"));
        await cyberToken.waitForDeployment();

        // 2. Deploy Posture Registry
        const Posture = await ethers.getContractFactory("PostureRegistry");
        postureRegistry = await Posture.deploy();
        await postureRegistry.waitForDeployment();

        // 3. Deploy Policy Engine
        const Policy = await ethers.getContractFactory("PolicyEngine");
        policyEngine = await Policy.deploy();
        await policyEngine.waitForDeployment();

        // 4. Deploy Claims Processor
        const Claims = await ethers.getContractFactory("ClaimsProcessor");
        claimsProcessor = await Claims.deploy(
            await postureRegistry.getAddress(),
            await policyEngine.getAddress(),
            await cyberToken.getAddress()
        );
        await claimsProcessor.waitForDeployment();

        // Setup: Fund the ClaimsProcessor with 50,000 tokens so it has liquidity to pay out claims
        await cyberToken.transfer(await claimsProcessor.getAddress(), ethers.parseEther("50000"));
    });

    describe("1. Policy Setup & Claim Filing (Happy Path)", function () {
        it("Should allow the insurer to set a policy and the company to file a claim", async function () {
            // Insurer (deployer) sets an active policy for the company
            await policyEngine.setPolicy(
                company.address,
                ["Firewall Active"],
                [true],
                [86400],
                [100]
            );

            const isActive = await policyEngine.isPolicyActive(company.address);
            expect(isActive).to.be.true;

            // Company files a claim requesting 1,000 tokens
            const claimAmount = ethers.parseEther("1000");

            // Expect the smart contract to emit a ClaimFiled event
            await expect(claimsProcessor.connect(company).fileClaim(Date.now(), "Ransomware", claimAmount))
                .to.emit(claimsProcessor, "ClaimFiled")
                .withArgs(0, company.address, claimAmount);

            const claim = await claimsProcessor.getClaim(0);
            expect(claim.company).to.equal(company.address);
            expect(claim.verdict).to.equal(0); // 0 corresponds to Verdict.PENDING
        });
    });

    describe("2. Claim Processing & Token Payout (Happy Path)", function () {
        it("Should process the claim based on AI score and transfer ERC20 tokens to the company", async function () {
            // 1. Give the company a perfect Security Hygiene Score (100)
            const mockMerkleRoot = ethers.encodeBytes32String("mock-root");
            await postureRegistry.connect(company).recordSnapshot(mockMerkleRoot, 100);

            // 2. Backend (deployer) records a low AI Fraud Score (10%) for Claim 0
            const mockReportHash = ethers.encodeBytes32String("mock-report");
            await claimsProcessor.recordFraudScore(0, 10, mockReportHash);

            // 3. Verify company balance is ZERO before payout
            const balanceBefore = await cyberToken.balanceOf(company.address);
            expect(balanceBefore).to.equal(0n);

            // 4. Backend processes the claim
            await expect(claimsProcessor.processClaim(0))
                .to.emit(claimsProcessor, "ClaimProcessed")
                .withArgs(0, 1, ethers.parseEther("1000")); // 1 corresponds to Verdict.APPROVED

            // 5. Verify the token transfer actually happened! (Company now has 1,000 tokens)
            const balanceAfter = await cyberToken.balanceOf(company.address);
            expect(balanceAfter).to.equal(ethers.parseEther("1000"));
        });
    });

    describe("3. Access Control & Security Reverts (Edge Case)", function () {
        it("Should revert if an unauthorized user tries to record an AI fraud score", async function () {
            const mockReportHash = ethers.encodeBytes32String("hacked-report");

            // Unauthorized user (e.g., a hacker) tries to call the onlyBackend function
            await expect(
                claimsProcessor.connect(unauthorizedUser).recordFraudScore(0, 50, mockReportHash)
            ).to.be.revertedWith("Only backend can record AI scores");
        });
    });
});