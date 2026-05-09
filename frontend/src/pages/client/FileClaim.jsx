import React, { useState } from 'react';
import { ethers } from 'ethers';
import { getContract } from '../../config';
import TxFeedback from '../../components/TxFeedback';

export default function FileClaim({ provider }) {
  const [attackType, setAttackType] = useState("Ransomware");
  const [amount, setAmount] = useState("1000");
  const [loading, setLoading] = useState(false);
  const [txHash, setTxHash] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    setLoading(true); setTxHash(""); setError("");
    try {
      const signer = await provider.getSigner();
      const contract = getContract('ClaimsProcessor', signer);
      const claimAmount = ethers.parseEther(amount);
      const breachTs = Math.floor(Date.now() / 1000);
      const tx = await contract.fileClaim(breachTs, attackType, claimAmount);
      await tx.wait();
      setTxHash(tx.hash);
    } catch (e) {
      setError(e.reason || e.message || "Transaction failed. Ensure you have an active policy.");
    }
    setLoading(false);
  };

  return (
    <>
      <div>
        <h1 className="page-title">File Insurance Claim</h1>
        <p className="page-subtitle">Submit a cyber insurance claim for review and AI adjudication</p>
      </div>

      <div style={{ maxWidth: 550 }}>
        <div className="glass-panel">
          <div className="form-group" style={{ marginBottom: '1rem' }}>
            <label className="form-label">Attack Type</label>
            <select className="form-select" value={attackType} onChange={e => setAttackType(e.target.value)}>
              <option>Ransomware</option>
              <option>DDoS Attack</option>
              <option>Data Breach</option>
              <option>Phishing</option>
              <option>Supply Chain</option>
            </select>
          </div>

          <div className="form-group" style={{ marginBottom: '1rem' }}>
            <label className="form-label">Claimed Amount (CIT)</label>
            <input className="form-input" type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="e.g. 1000" />
          </div>

          <div className="form-group" style={{ marginBottom: '1.5rem' }}>
            <label className="form-label">Breach Timestamp</label>
            <input className="form-input" type="text" value={new Date().toLocaleString()} disabled style={{ opacity: 0.6 }} />
            <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: '0.25rem' }}>Auto-set to current time</div>
          </div>

          <button className="btn btn-primary btn-block" onClick={handleSubmit} disabled={loading}>
            {loading ? '⏳ Filing Claim...' : '📋 File Insurance Claim'}
          </button>

          <TxFeedback loading={loading} txHash={txHash} error={error} />

          {txHash && (
            <div className="glass-panel" style={{ marginTop: '1rem', background: 'rgba(56,189,248,0.05)' }}>
              <h4 style={{ fontSize: '0.875rem', marginBottom: '0.5rem' }}>📌 What happens next?</h4>
              <ol style={{ fontSize: '0.8rem', color: 'var(--text-muted)', paddingLeft: '1rem', lineHeight: 1.8 }}>
                <li>The AI Fraud Analyzer will evaluate your claim</li>
                <li>Your Security Hygiene Score (SHS) will be checked</li>
                <li>The ClaimsProcessor contract will adjudicate the verdict</li>
                <li>If approved, CIT tokens are transferred to your wallet automatically</li>
              </ol>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
