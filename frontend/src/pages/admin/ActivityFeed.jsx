import React, { useState, useEffect } from 'react';

const BACKEND = 'http://localhost:8000';

const ACTION_META = {
  FIREWALL_BLOCK: { icon: '🔥', color: 'var(--accent-red)', badge: 'badge-denied' },
  IP_BLOCK: { icon: '🚫', color: 'var(--accent-red)', badge: 'badge-denied' },
  QUARANTINE: { icon: '🔒', color: 'var(--accent-red)', badge: 'badge-denied' },
  PATCH_FLAG: { icon: '🩹', color: 'var(--accent-orange)', badge: 'badge-high' },
  ALERT_ESCALATION: { icon: '🚨', color: 'var(--accent-orange)', badge: 'badge-medium' },
  POLICY_CHECK: { icon: '📋', color: 'var(--accent-yellow)', badge: 'badge-pending' },
  NOTARIZATION: { icon: '⛓️', color: 'var(--accent-green)', badge: 'badge-approved' },
};

const FILTERS = ['ALL', 'SECURITY', 'FRAUD', 'NOTARIZATION'];

const SECURITY_TYPES = ['FIREWALL_BLOCK', 'IP_BLOCK', 'QUARANTINE', 'PATCH_FLAG', 'ALERT_ESCALATION'];

function timeAgo(ts) {
  const diff = Math.floor(Date.now() / 1000) - ts;
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return new Date(ts * 1000).toLocaleDateString();
}

export default function AdminActivityFeed() {
  const [feed, setFeed] = useState([]);
  const [filter, setFilter] = useState('ALL');
  const [backendOnline, setBackendOnline] = useState(null);

  useEffect(() => {
    const fetchFeed = async () => {
      try {
        const res = await fetch(`${BACKEND}/api/activity-feed?limit=100`);
        if (!res.ok) throw new Error();
        const data = await res.json();
        setFeed(data);
        setBackendOnline(true);
      } catch {
        setBackendOnline(false);
      }
    };
    fetchFeed();
    const int = setInterval(fetchFeed, 5000);
    return () => clearInterval(int);
  }, []);

  const filtered = feed.filter(item => {
    if (filter === 'ALL') return true;
    if (filter === 'SECURITY') return SECURITY_TYPES.includes(item.action_type);
    if (filter === 'FRAUD') return item.action_type === 'POLICY_CHECK';
    if (filter === 'NOTARIZATION') return item.action_type === 'NOTARIZATION';
    return true;
  });

  const meta = (type) => ACTION_META[type] || { icon: '⚙️', color: 'var(--text-muted)', badge: '' };

  return (
    <>
      <div>
        <h1 className="page-title">Activity Feed</h1>
        <p className="page-subtitle">Real-time log of all backend security actions — powered by SQLite DB</p>
      </div>

      {/* Backend Status */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <div style={{
          width: 8, height: 8, borderRadius: '50%',
          background: backendOnline === true ? 'var(--accent-green)' : backendOnline === false ? 'var(--accent-red)' : 'var(--text-dim)',
          animation: backendOnline ? 'pulse-glow 2s infinite' : 'none'
        }} />
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          {backendOnline === true ? 'Backend Connected' : backendOnline === false ? 'Backend Offline — Start FastAPI to see live data' : 'Connecting...'}
        </span>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        {FILTERS.map(f => (
          <button key={f} className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-outline'}`} onClick={() => setFilter(f)}>
            {f}
          </button>
        ))}
        <span style={{ marginLeft: 'auto', fontSize: '0.8rem', color: 'var(--text-muted)', alignSelf: 'center' }}>
          {filtered.length} events
        </span>
      </div>

      {/* Timeline */}
      <div className="glass-panel">
        {!backendOnline && backendOnline !== null ? (
          <div className="empty-state">
            <div className="empty-icon">🔌</div>
            <p>Backend is offline. Start FastAPI to populate the activity feed.</p>
            <code style={{ fontSize: '0.8rem', color: 'var(--accent-blue)', display: 'block', marginTop: '0.5rem' }}>
              cd backend && uvicorn main:app --reload --workers 1
            </code>
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📡</div>
            <p>No actions recorded yet. Trigger security events via the API.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {filtered.map((item, i) => {
              const m = meta(item.action_type);
              return (
                <div key={i} style={{
                  display: 'grid', gridTemplateColumns: '40px 140px 1fr 140px 80px',
                  alignItems: 'center', gap: '1rem',
                  padding: '0.875rem 0.5rem',
                  borderBottom: i < filtered.length - 1 ? '1px solid var(--border-color)' : 'none',
                  transition: 'background 0.15s',
                  borderRadius: 'var(--radius-sm)',
                }}>
                  <div style={{ fontSize: '1.25rem', textAlign: 'center' }}>{m.icon}</div>
                  <span className={`badge ${m.badge}`} style={{ justifyContent: 'center' }}>
                    {item.action_type.replace('_', ' ')}
                  </span>
                  <div>
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-main)', marginBottom: '0.1rem' }}>
                      {item.description}
                    </div>
                    {item.target && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                        Target: {item.target}
                      </div>
                    )}
                    {item.reasoning && (
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.25rem', fontStyle: 'italic' }}>
                        AI: "{item.reasoning.substring(0, 100)}..."
                      </div>
                    )}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {item.triggered_by}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', textAlign: 'right' }}>
                    {timeAgo(item.timestamp)}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
