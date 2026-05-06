import { ethers } from 'ethers';

// Connect to the local Hardhat node
const provider = new ethers.JsonRpcProvider('http://127.0.0.1:8545');

// In a real app, we'd fetch the ABIs from the compiled contracts.
// For the UI, we only need the view functions to read data.
const POSTURE_ABI = [
  "function getLatestScore() public view returns (uint256)",
  "function getAverageScore(uint256 daysCount) public view returns (uint256)"
];

const AUDIT_ABI = [
  "function getAuditDetails(uint256 entryId) public view returns (bytes32 actionHash, uint256 timestamp, address agent)",
  "event ActionLogged(uint256 indexed entryId, bytes32 indexed actionHash, uint256 timestamp, address agent)"
];

export const getPostureScore = async (postureAddress) => {
  try {
    const contract = new ethers.Contract(postureAddress, POSTURE_ABI, provider);
    const score = await contract.getLatestScore();
    return Number(score);
  } catch (error) {
    console.error("Error fetching posture score:", error);
    return null;
  }
};

export const getAuditDetails = async (auditAddress, entryId) => {
  try {
    const contract = new ethers.Contract(auditAddress, AUDIT_ABI, provider);
    const details = await contract.getAuditDetails(entryId);
    return {
      actionHash: details[0],
      timestamp: new Date(Number(details[1]) * 1000).toLocaleString(),
      agent: details[2]
    };
  } catch (error) {
    console.error("Error fetching audit details:", error);
    return null;
  }
};
