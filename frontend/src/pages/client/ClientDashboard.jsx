import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { getContract, formatCIT, truncAddr, formatTime } from '../../config';
import StatusBadge from '../../components/StatusBadge';

export default function ClientDashboard({ provider, account }) {
  const [balance, setBalance] = useState('0');
  const [shs, setShs] = useState(0);
  const [policyActive, setPolicyActive] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [totalClaims, setTotalClaims] = useState(0);

  useEffect(() => {
    const fetch = async () => {
      if (!provider || !account) return;
      try {
        const token = getContract('CyberToken', provider);
        const bal = await token.balanceOf(account);
        setBalance(ethers.formatUnits(bal, 18));

        const posture = getContract('PostureRegistry', provider);
        try { setShs(Number(await posture.getSecurityHygieneScore(account))); } catch (e) { setShs(0); }

        const policy = getContract('PolicyEngine', provider);
        setPolicyActive(await policy.isPolicyActive(account));

        const claims = getContract('ClaimsProcessor', provider);
        const count = Number(await claims.claimCount());
        let pending = 0, total = 0;
        for (let i = 0; i < count; i++) {
          const c = await claims.getClaim(i);
          if (c.company.toLowerCase() === account.toLowerCase()) {
            total++;
            if (Number(c.verdict) === 0) pending++;
          }
        }
        setPendingCount(pending);
        setTotalClaims(total);
      } catch (e) { console.error('ClientDashboard fetch:', e); }
    };
    fetch();
    const int = setInterval(fetch, 5000);
    return () => clearInterval(int);
  }, [provider, account]);

  const shsColor = shs >= 90 ? 'var(--accent-green)' : shs >= 50 ? 'var(--accent-yellow)' : 'var(--accent-red)';

  return (
    <>
      <div>
        <h1 className="page-title">Company Dashboard</h1>
        <p className="page-subtitle">Your security posture and insurance status</p>
      </div>

      <div className="grid-3">
        {/* CIT Balance */}
        <div className="glass-panel" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>CIT Balance</div>
          <div style={{ fontSize: '2.5rem', fontWeight: 800, fontFamily: 'var(--font-heading)', color: 'var(--accent-blue)' }}>
            {parseFloat(balance).toLocaleString()}
          </div>
          <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Cyber Insurance Tokens</div>
        </div>

        {/* SHS Score */}
        <div className="glass-panel" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Security Hygiene Score</div>
          <div style={{ position: 'relative', width: 120, height: 120, margin: '0.5rem auto' }}>
            <svg viewBox="0 0 36 36" style={{ transform: 'rotate(-90deg)', width: '100%', height: '100%' }}>
              <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="3" />
              <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke={shsColor} strokeWidth="3" strokeDasharray={`${shs}, 100`} />
            </svg>
            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: shsColor }}>{shs}</div>
            </div>
          </div>
          <div style={{ fontSize: '0.875rem', color: shsColor, fontWeight: 600 }}>
            {shs >= 90 ? 'Optimal' : shs >= 50 ? 'Moderate' : 'At Risk'}
          </div>
        </div>

        {/* Policy & Claims */}
        <div className="glass-panel">
          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Policy Status</div>
            <span className={`badge ${policyActive ? 'badge-active' : 'badge-inactive'}`}>
              {policyActive ? 'ACTIVE' : 'NO POLICY'}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Total Claims</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{totalClaims}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Pending</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: pendingCount > 0 ? 'var(--accent-yellow)' : 'var(--text-main)' }}>{pendingCount}</div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
