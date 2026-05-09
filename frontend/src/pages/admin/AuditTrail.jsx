import React, { useState, useEffect } from 'react';
import { getContract, truncHash, formatTime } from '../../config';
import StatusBadge from '../../components/StatusBadge';
import TxFeedback from '../../components/TxFeedback';

export default function AuditTrail({ provider }) {
  const [entries, setEntries] = useState([]);
  const [govStatus, setGovStatus] = useState({}); // { [entryId]: { pending, approved } }
  const [actionState, setActionState] = useState({});

  useEffect(() => {
    const fetch = async () => {
      if (!provider) return;
      try {
        const audit = getContract('AuditRegistry', provider);
        const gov = getContract('Governance', provider);
        const count = Number(await audit.getEntryCount());
        const arr = [];
        const gs = {};
        for (let i = 0; i < count; i++) {
          const e = await audit.getEntry(i);
          arr.push({ id: i, actionHash: e.actionHash, riskLevel: Number(e.riskLevel), timestamp: e.timestamp, instructionHash: e.instructionHash });
          if (Number(e.riskLevel) >= 2) {
            try {
              const pending = await gov.isPending(i);
              const approved = await gov.isApproved(i);
              gs[i] = { pending, approved };
            } catch (err) { gs[i] = { pending: false, approved: false }; }
          }
        }
        setEntries(arr);
        setGovStatus(gs);
      } catch (e) { console.error('AuditTrail fetch:', e); }
    };
    fetch();
    const int = setInterval(fetch, 8000);
    return () => clearInterval(int);
  }, [provider]);

  const handleGovAction = async (entryId, action) => {
    setActionState(s => ({ ...s, [entryId]: { loading: true, txHash: '', error: '' } }));
    try {
      const signer = await provider.getSigner();
      const gov = getContract('Governance', signer);
      let tx;
      if (action === 'request') tx = await gov.requestApproval(entryId);
      else if (action === 'approve') tx = await gov.approve(entryId);
      else tx = await gov.reject(entryId);
      await tx.wait();
      setActionState(s => ({ ...s, [entryId]: { loading: false, txHash: tx.hash, error: '' } }));
    } catch (e) {
      setActionState(s => ({ ...s, [entryId]: { loading: false, txHash: '', error: e.reason || e.message } }));
    }
  };

  return (
    <>
      <div>
        <h1 className="page-title">Audit Trail & Governance</h1>
        <p className="page-subtitle">AI action logs from AuditRegistry + human oversight for HIGH/CRITICAL</p>
      </div>

      <div className="glass-panel">
        <h3 className="section-title">🧠 AI Action Log ({entries.length} entries)</h3>
        {entries.length === 0 ? (
          <div className="empty-state"><div className="empty-icon">🧠</div><p>No AI actions have been logged yet. Run the backend to generate entries.</p></div>
        ) : (
          <table className="data-table">
            <thead><tr><th>ID</th><th>Action Hash</th><th>Risk</th><th>Timestamp</th><th>Governance</th></tr></thead>
            <tbody>
              {entries.map(e => {
                const gs = govStatus[e.id];
                const as = actionState[e.id] || {};
                return (
                  <tr key={e.id}>
                    <td>#{e.id}</td>
                    <td className="mono">{truncHash(e.actionHash)}</td>
                    <td><StatusBadge value={e.riskLevel} type="risk" /></td>
                    <td>{formatTime(e.timestamp)}</td>
                    <td>
                      {Number(e.riskLevel) < 2 ? (
                        <span style={{ color: 'var(--text-dim)', fontSize: '0.75rem' }}>Auto-approved</span>
                      ) : gs?.approved ? (
                        <span className="badge badge-approved">APPROVED</span>
                      ) : gs?.pending ? (
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button className="btn btn-success btn-sm" onClick={() => handleGovAction(e.id, 'approve')} disabled={as.loading}>✓ Approve</button>
                          <button className="btn btn-danger btn-sm" onClick={() => handleGovAction(e.id, 'reject')} disabled={as.loading}>✕ Reject</button>
                        </div>
                      ) : (
                        <button className="btn btn-outline btn-sm" onClick={() => handleGovAction(e.id, 'request')} disabled={as.loading}>
                          {as.loading ? '⏳' : '📋'} Request Approval
                        </button>
                      )}
                      {as.txHash && <div style={{ fontSize: '0.65rem', color: 'var(--accent-green)', marginTop: '0.25rem' }}>✓ Tx confirmed</div>}
                      {as.error && <div style={{ fontSize: '0.65rem', color: 'var(--accent-red)', marginTop: '0.25rem' }}>{as.error.substring(0, 50)}</div>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
