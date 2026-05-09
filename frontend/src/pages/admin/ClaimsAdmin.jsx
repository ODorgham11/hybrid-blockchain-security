import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { getContract, formatCIT, truncAddr, formatTime } from '../../config';
import StatusBadge from '../../components/StatusBadge';
import TxFeedback from '../../components/TxFeedback';

const BACKEND = 'http://localhost:8000';

export default function ClaimsAdmin({ provider }) {
  const [claims, setClaims] = useState([]);
  const [actionState, setActionState] = useState({});
  const [expandedAnalysis, setExpandedAnalysis] = useState({}); // { [claimId]: { loading, data, error } }

  const fetchAnalysis = async (claimId) => {
    if (expandedAnalysis[claimId]?.data) {
      // Toggle off if already loaded
      setExpandedAnalysis(s => ({ ...s, [claimId]: undefined }));
      return;
    }
    setExpandedAnalysis(s => ({ ...s, [claimId]: { loading: true } }));
    try {
      const res = await fetch(`${BACKEND}/api/claim-analysis/${claimId}`);
      if (!res.ok) throw new Error(res.status === 404 ? 'No analysis found — run the backend FraudAnalyzer' : 'Backend error');
      const data = await res.json();
      setExpandedAnalysis(s => ({ ...s, [claimId]: { loading: false, data } }));
    } catch (e) {
      setExpandedAnalysis(s => ({ ...s, [claimId]: { loading: false, error: e.message } }));
    }
  };

  useEffect(() => {
    const fetch = async () => {
      if (!provider) return;
      try {
        const contract = getContract('ClaimsProcessor', provider);
        const count = Number(await contract.claimCount());
        const arr = [];
        for (let i = 0; i < count; i++) {
          const c = await contract.getClaim(i);
          arr.push({
            id: i, company: c.company, attackType: c.attackType,
            amount: c.claimedAmount, verdict: Number(c.verdict),
            payoutPct: Number(c.payoutPercentage), fraudScore: Number(c.fraudScore),
            fraudHash: c.fraudReportHash, processedAt: c.processedAt
          });
        }
        setClaims(arr);
      } catch (e) { console.error('ClaimsAdmin fetch:', e); }
    };
    fetch();
    const int = setInterval(fetch, 5000);
    return () => clearInterval(int);
  }, [provider]);

  const handleProcess = async (claimId) => {
    setActionState(s => ({ ...s, [claimId]: { loading: true, txHash: '', error: '' } }));
    try {
      const signer = await provider.getSigner();
      const contract = getContract('ClaimsProcessor', signer);

      // Record fraud score if not set
      const claim = claims.find(c => c.id === claimId);
      if (claim && claim.fraudHash === ethers.ZeroHash) {
        const hash = ethers.encodeBytes32String("UI-SCORED");
        const tx1 = await contract.recordFraudScore(claimId, 10, hash);
        await tx1.wait();
      }

      // Process claim
      const tx = await contract.processClaim(claimId);
      await tx.wait();
      setActionState(s => ({ ...s, [claimId]: { loading: false, txHash: tx.hash, error: '' } }));
    } catch (e) {
      setActionState(s => ({ ...s, [claimId]: { loading: false, txHash: '', error: e.reason || e.message } }));
    }
  };

  return (
    <>
      <div>
        <h1 className="page-title">Claims Administration</h1>
        <p className="page-subtitle">View, score, and process all insurance claims</p>
      </div>

      <div className="glass-panel">
        <h3 className="section-title">📋 All Claims ({claims.length})</h3>
        {claims.length === 0 ? (
          <div className="empty-state"><div className="empty-icon">📋</div><p>No claims have been filed yet.</p></div>
        ) : (
          <table className="data-table">
            <thead>
              <tr><th>ID</th><th>Company</th><th>Attack</th><th>Amount</th><th>Fraud</th><th>Verdict</th><th>Payout</th><th>Processed</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {claims.map(c => {
                const as = actionState[c.id] || {};
                const analysis = expandedAnalysis[c.id];
                return (
                  <React.Fragment key={c.id}>
                    <tr>
                      <td>#{c.id}</td>
                      <td className="mono">{truncAddr(c.company)}</td>
                      <td>{c.attackType}</td>
                      <td>{formatCIT(c.amount)} CIT</td>
                      <td>{c.fraudScore}/100</td>
                      <td><StatusBadge value={c.verdict} /></td>
                      <td>{c.payoutPct}%</td>
                      <td>{formatTime(c.processedAt)}</td>
                      <td>
                        {c.verdict === 0 ? (
                          <div>
                            <button className="btn btn-success btn-sm" onClick={() => handleProcess(c.id)} disabled={as.loading}>
                              {as.loading ? '⏳' : '⚡'} {as.loading ? 'Processing...' : 'Score & Process'}
                            </button>
                            {as.txHash && <div style={{ fontSize: '0.7rem', color: 'var(--accent-green)', marginTop: '0.25rem' }}>✓ {as.txHash.substring(0, 14)}...</div>}
                            {as.error && <div style={{ fontSize: '0.7rem', color: 'var(--accent-red)', marginTop: '0.25rem' }}>✕ {as.error.substring(0, 40)}</div>}
                          </div>
                        ) : (
                          <button className="btn btn-outline btn-sm" onClick={() => fetchAnalysis(c.id)}>
                            {analysis?.data ? '▲ Hide' : '📋 View Analysis'}
                          </button>
                        )}
                      </td>
                    </tr>
                    {/* Analysis Drawer */}
                    {analysis && (
                      <tr style={{ background: 'rgba(167,139,250,0.04)' }}>
                        <td colSpan={9} style={{ padding: '0.5rem 1.5rem 1.25rem' }}>
                          {analysis.loading && (
                            <div style={{ color: 'var(--accent-blue)', fontSize: '0.8rem' }}>⏳ Fetching analysis from backend...</div>
                          )}
                          {analysis.error && (
                            <div style={{ color: 'var(--accent-red)', fontSize: '0.8rem' }}>❌ {analysis.error}</div>
                          )}
                          {analysis.data && (
                            <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: 'var(--radius-md)', padding: '1rem', borderLeft: '3px solid var(--accent-purple)' }}>
                              <div style={{ display: 'flex', gap: '2rem', marginBottom: '0.75rem' }}>
                                <div>
                                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>FRAUD SCORE</div>
                                  <div style={{ fontSize: '1.5rem', fontWeight: 800, color: analysis.data.fraud_score < 30 ? 'var(--accent-green)' : analysis.data.fraud_score < 75 ? 'var(--accent-yellow)' : 'var(--accent-red)' }}>
                                    {analysis.data.fraud_score}/100
                                  </div>
                                </div>
                                <div>
                                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>RECOMMENDATION</div>
                                  <span className={`badge ${analysis.data.recommendation === 'APPROVE' ? 'badge-approved' : analysis.data.recommendation === 'PARTIAL' ? 'badge-partial' : 'badge-denied'}`}>
                                    {analysis.data.recommendation}
                                  </span>
                                </div>
                              </div>
                              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '0.375rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>AI Reasoning</div>
                              <div style={{ fontSize: '0.85rem', color: 'var(--text-main)', lineHeight: 1.7 }}>{analysis.data.reasoning}</div>
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
