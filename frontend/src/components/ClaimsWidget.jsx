import React, { useState } from 'react';

// We only need the fileClaim interface for this component
const CLAIMS_PROCESSOR_ABI = [
  "function fileClaim(uint256 _breachTimestamp, string calldata _attackType, uint256 _claimedAmount) external returns (uint256)"
];

const ClaimsWidget = ({ account }) => {
  const [loading, setLoading] = useState(false);
  const [txHash, setTxHash] = useState("");

  const handleFileClaim = async () => {
    if (!account) {
      alert("Please connect MetaMask first!");
      return;
    }
    if (!window.ethereum) return;

    setLoading(true);
    setTxHash("");

    try {
      const ethersLib = window.ethers;
      if (!ethersLib) {
        alert("Ethers library is still loading. Please try again in a moment.");
        setLoading(false);
        return;
      }

      const provider = new ethersLib.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      // UPDATED TO MATCH YOUR LATEST DEPLOYMENT
      const CLAIMS_PROCESSOR_ADDRESS = "0xB7f8BC63BbcaD18155201308C8f3540b07f84F5e";
      const contract = new ethersLib.Contract(CLAIMS_PROCESSOR_ADDRESS, CLAIMS_PROCESSOR_ABI, signer);

      const claimAmount = ethersLib.parseEther("1000");

      // We use Math.floor(Date.now() / 1000) because Solidity expects Unix timestamps in seconds
      const tx = await contract.fileClaim(Math.floor(Date.now() / 1000), "Ransomware", claimAmount);

      await tx.wait();
      setTxHash(tx.hash);
    } catch (error) {
      console.error("Transaction Failed:", error);
      // This usually triggers if setup-policy.js wasn't run for this specific account
      alert("Transaction failed! Ensure your MetaMask account has an active policy assigned.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '1.5rem', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
      <h3 style={{ marginTop: 0, color: '#fff' }}>Insurance Claims</h3>
      <p style={{ fontSize: '0.875rem', color: '#a1a1aa' }}>Automated adjudicator status</p>

      <div style={{ marginTop: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', color: '#fff' }}>
          <span>Pending Claims</span>
          <span style={{ fontWeight: 600 }}>0</span>
        </div>

        <button
          onClick={handleFileClaim}
          disabled={loading}
          style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', background: 'transparent', border: '1px solid #007bff', color: '#007bff', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', marginBottom: '0.5rem', transition: 'all 0.2s' }}
        >
          {loading ? "Processing Transaction..." : "File New Claim via MetaMask"}
        </button>

        {txHash && (
          <div style={{ fontSize: '0.75rem', color: '#28a745', wordBreak: 'break-all', marginTop: '0.5rem', padding: '0.5rem', background: 'rgba(40,167,69,0.1)', borderRadius: '4px', border: '1px solid rgba(40,167,69,0.2)' }}>
            Success! Tx: {txHash}
          </div>
        )}
      </div>
    </div>
  );
};

export default ClaimsWidget;