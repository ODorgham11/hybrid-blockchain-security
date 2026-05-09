import React, { useState } from 'react';
import { ethers } from 'ethers';
import { getContract } from '../../config';
import TxFeedback from '../../components/TxFeedback';

export default function PolicyManager({ provider }) {
  const [companyAddr, setCompanyAddr] = useState("0x70997970C51812dc3A010C7d01b50e0d17dc79C8");
  const [rules, setRules] = useState([
    { name: "Firewall Active", required: true, weight: 50 },
    { name: "MFA Enforced", required: true, weight: 50 },
  ]);
  const [loading, setLoading] = useState(false);
  const [txHash, setTxHash] = useState("");
  const [error, setError] = useState("");

  // Lookup state
  const [lookupAddr, setLookupAddr] = useState("0x70997970C51812dc3A010C7d01b50e0d17dc79C8");
  const [policyData, setPolicyData] = useState(null);
  const [isActive, setIsActive] = useState(null);

  const addRule = () => setRules([...rules, { name: "", required: true, weight: 0 }]);
  const removeRule = (i) => setRules(rules.filter((_, idx) => idx !== i));
  const updateRule = (i, field, val) => { const n = [...rules]; n[i][field] = val; setRules(n); };

  const handleSetPolicy = async () => {
    setLoading(true); setTxHash(""); setError("");
    try {
      const signer = await provider.getSigner();
      const contract = getContract('PolicyEngine', signer);
      const names = rules.map(r => r.name);
      const flags = rules.map(r => r.required);
      const ages = rules.map(() => 86400);
      const weights = rules.map(r => r.weight);
      const tx = await contract.setPolicy(companyAddr, names, flags, ages, weights);
      await tx.wait();
      setTxHash(tx.hash);
    } catch (e) {
      setError(e.reason || e.message);
    }
    setLoading(false);
  };

  const handleLookup = async () => {
    try {
      const contract = getContract('PolicyEngine', provider);
      const active = await contract.isPolicyActive(lookupAddr);
      const pol = await contract.getPolicy(lookupAddr);
      setIsActive(active);
      setPolicyData(pol.map(r => ({ name: r.ruleName, required: r.required, weight: Number(r.weight) })));
    } catch (e) {
      setPolicyData(null); setIsActive(false);
    }
  };

  return (
    <>
      <div>
        <h1 className="page-title">Policy Manager</h1>
        <p className="page-subtitle">Set and lookup insurance policies for companies</p>
      </div>

      <div className="grid-2">
        {/* SET POLICY */}
        <div className="glass-panel">
          <h3 className="section-title">📜 Deploy Policy</h3>
          <div className="form-group" style={{ marginBottom: '1rem' }}>
            <label className="form-label">Company Address</label>
            <input className="form-input" value={companyAddr} onChange={e => setCompanyAddr(e.target.value)} />
          </div>

          <div style={{ marginBottom: '0.75rem', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Policy Rules</div>
          {rules.map((r, i) => (
            <div key={i} className="form-row" style={{ marginBottom: '0.5rem' }}>
              <div className="form-group" style={{ flex: 2 }}>
                <input className="form-input" placeholder="Rule name" value={r.name} onChange={e => updateRule(i, 'name', e.target.value)} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input type="checkbox" className="form-checkbox" checked={r.required} onChange={e => updateRule(i, 'required', e.target.checked)} />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Req</span>
              </div>
              <div className="form-group" style={{ width: '80px' }}>
                <input className="form-input" type="number" placeholder="Wt" value={r.weight} onChange={e => updateRule(i, 'weight', parseInt(e.target.value) || 0)} />
              </div>
              <button className="btn btn-danger btn-sm" onClick={() => removeRule(i)}>✕</button>
            </div>
          ))}
          <button className="btn btn-outline btn-sm" onClick={addRule} style={{ marginBottom: '1rem' }}>+ Add Rule</button>
          <button className="btn btn-primary btn-block" onClick={handleSetPolicy} disabled={loading}>
            {loading ? "Deploying..." : "Deploy Policy On-Chain"}
          </button>
          <TxFeedback loading={loading} txHash={txHash} error={error} />
        </div>

        {/* LOOKUP POLICY */}
        <div className="glass-panel">
          <h3 className="section-title">🔍 Lookup Policy</h3>
          <div className="form-group" style={{ marginBottom: '1rem' }}>
            <label className="form-label">Company Address</label>
            <div className="form-row">
              <input className="form-input" value={lookupAddr} onChange={e => setLookupAddr(e.target.value)} />
              <button className="btn btn-primary" onClick={handleLookup}>Lookup</button>
            </div>
          </div>

          {isActive !== null && (
            <div style={{ marginBottom: '1rem' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Status: </span>
              <span className={`badge ${isActive ? 'badge-active' : 'badge-inactive'}`}>{isActive ? 'ACTIVE' : 'INACTIVE'}</span>
            </div>
          )}

          {policyData && policyData.length > 0 && (
            <table className="data-table">
              <thead><tr><th>Rule</th><th>Required</th><th>Weight</th></tr></thead>
              <tbody>
                {policyData.map((r, i) => (
                  <tr key={i}>
                    <td>{r.name}</td>
                    <td>{r.required ? '✅ Yes' : '❌ No'}</td>
                    <td>{r.weight}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {policyData && policyData.length === 0 && (
            <div className="empty-state"><p>No policy rules found for this address.</p></div>
          )}
        </div>
      </div>
    </>
  );
}
