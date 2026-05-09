import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { getContract, formatCIT, formatTime } from '../../config';
import StatusBadge from '../../components/StatusBadge';

export default function MyClaims({ provider, account, onNavigate }) {
  const [claims, setClaims] = useState([]);

  useEffect(() => {
    const fetch = async () => {
      if (!provider || !account) return;
      try {
        const contract = getContract('ClaimsProcessor', provider);
        const count = Number(await contract.claimCount());
        const mine = [];
        for (let i = 0; i < count; i++) {
          const c = await contract.getClaim(i);
          if (c.company.toLowerCase() === account.toLowerCase()) {
            mine.push({
              id: i, attackType: c.attackType, amount: c.claimedAmount,
              verdict: Number(c.verdict), payoutPct: Number(c.payoutPercentage),
              fraudScore: Number(c.fraudScore), breachTs: c.breachTimestamp,
              processedAt: c.processedAt
            });
          }
        }
        setClaims(mine);
      } catch (e) { console.error('MyClaims fetch:', e); }
    };
    fetch();
    const int = setInterval(fetch, 5000);
    return () => clearInterval(int);
  }, [provider, account]);

  return (
    <>
      <div>
        <h1 className="page-title">My Claims</h1>
        <p className="page-subtitle">History of all insurance claims filed from your wallet</p>
      </div>

      <div className="glass-panel">
        {claims.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📋</div>
            <p>You haven't filed any claims yet.</p>
            <button className="btn btn-primary" onClick={() => onNavigate && onNavigate('file-claim')}>File Your First Claim</button>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr><th>ID</th><th>Attack Type</th><th>Amount</th><th>Verdict</th><th>Payout</th><th>Fraud Score</th><th>Filed</th><th>Processed</th></tr>
            </thead>
            <tbody>
              {claims.map(c => (
                <tr key={c.id}>
                  <td>#{c.id}</td>
                  <td>{c.attackType}</td>
                  <td>{formatCIT(c.amount)} CIT</td>
                  <td><StatusBadge value={c.verdict} /></td>
                  <td>{c.payoutPct}%</td>
                  <td>{c.fraudScore}/100</td>
                  <td>{formatTime(c.breachTs)}</td>
                  <td>{formatTime(c.processedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
