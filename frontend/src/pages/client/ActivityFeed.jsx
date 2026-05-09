import React, { useState, useEffect } from 'react';

const BACKEND = 'http://localhost:8000';

function timeAgo(ts) {
  const diff = Math.floor(Date.now() / 1000) - ts;
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return new Date(ts * 1000).toLocaleDateString();
}

export default function ClientActivityFeed({ account }) {
  const [feed, setFeed] = useState([]);
  const [backendOnline, setBackendOnline] = useState(null);

  useEffect(() => {
    const fetchFeed = async () => {
      try {
        const res = await fetch(`${BACKEND}/api/activity-feed?limit=100`);
        if (!res.ok) throw new Error();
        const data = await res.json();
        // Show only POLICY_CHECK (fraud analysis) for this client
        const mine = data.filter(
          item => item.action_type === 'POLICY_CHECK' || item.action_type === 'NOTARIZATION'
        );
        setFeed(mine);
        setBackendOnline(true);
      } catch {
        setBackendOnline(false);
      }
    };
    fetchFeed();
    const int = setInterval(fetchFeed, 5000);
    return () => clearInterval(int);
  }, [account]);

  return (
    <>
      <div>
        <h1 className="page-title">Activity Feed</h1>
        <p className="page-subtitle">Status of your claims and notarizations</p>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <div style={{
          width: 8, height: 8, borderRadius: '50%',
          background: backendOnline === true ? 'var(--accent-green)' : backendOnline === false ? 'var(--accent-red)' : 'var(--text-dim)',
        }} />
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          {backendOnline === true ? 'Backend Connected' : backendOnline === false ? 'Backend Offline' : 'Connecting...'}
        </span>
      </div>

      <div className="glass-panel">
        {!backendOnline && backendOnline !== null ? (
          <div className="empty-state">
            <div className="empty-icon">🔌</div>
            <p>Backend is offline. Your activity will appear here once the system is active.</p>
          </div>
        ) : feed.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📋</div>
            <p>No activity yet. File a claim to see it analyzed here.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {feed.map((item, i) => (
              <div key={i} style={{
                display: 'grid', gridTemplateColumns: '36px 1fr 80px',
                alignItems: 'start', gap: '1rem',
                padding: '1rem 0.5rem',
                borderBottom: i < feed.length - 1 ? '1px solid var(--border-color)' : 'none',
              }}>
                <div style={{ fontSize: '1.25rem', textAlign: 'center', paddingTop: '2px' }}>
                  {item.action_type === 'POLICY_CHECK' ? '📋' : '⛓️'}
                </div>
                <div>
                  <div style={{ fontSize: '0.875rem', color: 'var(--text-main)', fontWeight: 500, marginBottom: '0.25rem' }}>
                    {item.description}
                  </div>
                  {item.reasoning && (
                    <div style={{
                      fontSize: '0.78rem', color: 'var(--text-muted)',
                      background: 'rgba(0,0,0,0.2)', padding: '0.5rem',
                      borderRadius: 'var(--radius-sm)', marginTop: '0.25rem',
                      fontStyle: 'italic', lineHeight: 1.5
                    }}>
                      {item.reasoning.substring(0, 200)}{item.reasoning.length > 200 ? '...' : ''}
                    </div>
                  )}
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', textAlign: 'right', paddingTop: '2px' }}>
                  {timeAgo(item.timestamp)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
