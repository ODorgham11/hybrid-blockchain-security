import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { getContract, ADDRESSES, formatCIT, truncAddr, formatTime } from '../../config';
import StatusBadge from '../../components/StatusBadge';

export default function AdminDashboard({ provider }) {
  const [stats, setStats] = useState({ totalClaims: 0, pendingClaims: 0, liquidity: '0', aiActions: 0 });
  const [recentClaims, setRecentClaims] = useState([]);

  useEffect(() => {
    const fetch = async () => {
      if (!provider) return;
      try {
        const claims = getContract('ClaimsProcessor', provider);
        const token = getContract('CyberToken', provider);
        const audit = getContract('AuditRegistry', provider);

        const count = Number(await claims.claimCount());
        const liq = await token.balanceOf(ADDRESSES.ClaimsProcessor);
        let aiCount = 0;
        try { aiCount = Number(await audit.getEntryCount()); } catch (e) { }

        let pending = 0;
        const recent = [];
        for (let i = 0; i < count; i++) {
          const c = await claims.getClaim(i);
          if (Number(c.verdict) === 0) pending++;
          if (i >= Math.max(0, count - 5)) {
            recent.push({ id: i, company: c.company, attackType: c.attackType, amount: c.claimedAmount, verdict: Number(c.verdict), ts: c.breachTimestamp });
          }
        }

        setStats({ totalClaims: count, pendingClaims: pending, liquidity: formatCIT(liq), aiActions: aiCount });
        setRecentClaims(recent);
      } catch (e) { console.error('AdminDashboard fetch:', e); }
    };
    fetch();
    const int = setInterval(fetch, 5000);
    return () => clearInterval(int);
  }, [provider]);

  return (
    <>
      <div>
        <h1 className="page-title">Insurer Dashboard</h1>
        <p className="page-subtitle">System overview — live contract data</p>
      </div>

      <div className="grid-4">
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(56,189,248,0.1)' }}>📋</div>
          <div className="stat-info">
            <div className="stat-label">Total Claims</div>
            <div className="stat-value">{stats.totalClaims}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(251,191,36,0.1)' }}>⏳</div>
          <div className="stat-info">
            <div className="stat-label">Pending</div>
            <div className="stat-value" style={{ color: 'var(--accent-yellow)' }}>{stats.pendingClaims}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(52,211,153,0.1)' }}>💰</div>
          <div className="stat-info">
            <div className="stat-label">CIT Liquidity</div>
            <div className="stat-value" style={{ color: 'var(--accent-green)' }}>{stats.liquidity}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(167,139,250,0.1)' }}>🧠</div>
          <div className="stat-info">
            <div className="stat-label">AI Actions</div>
            <div className="stat-value" style={{ color: 'var(--accent-purple)' }}>{stats.aiActions}</div>
          </div>
        </div>
      </div>

      <div className="glass-panel">
        <h3 className="section-title">📊 Recent Claims</h3>
        {recentClaims.length === 0 ? (
          <div className="empty-state"><p>No claims filed yet.</p></div>
        ) : (
          <table className="data-table">
            <thead><tr><th>ID</th><th>Company</th><th>Attack</th><th>Amount (CIT)</th><th>Verdict</th><th>Filed</th></tr></thead>
            <tbody>
              {recentClaims.map(c => (
                <tr key={c.id}>
                  <td>#{c.id}</td>
                  <td className="mono">{truncAddr(c.company)}</td>
                  <td>{c.attackType}</td>
                  <td>{formatCIT(c.amount)}</td>
                  <td><StatusBadge value={c.verdict} /></td>
                  <td>{formatTime(c.ts)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
