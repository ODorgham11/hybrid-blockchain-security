import React, { useState, useEffect } from 'react';
import { fetchDbDump } from '../../api/backend';

const DatabaseViewer = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const res = await fetchDbDump();
        setData(res.ai_decisions || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <header>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'white', marginBottom: '0.5rem' }}>Off-Chain Database Viewer (aegis.db)</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            This view displays the raw SQLite records containing the full granular AI reasoning. 
            Only events marked as "Critical/High" are notarized on-chain.
          </p>
        </header>

        {loading ? (
          <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2.5rem 0' }}>Loading DB dump...</div>
        ) : (
          <div style={{ overflowX: 'auto', borderRadius: '0.5rem', border: '1px solid var(--border-color)', background: 'var(--bg-card)', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)' }}>
            <table style={{ minWidth: '100%', textAlign: 'left', fontSize: '0.875rem', color: '#d1d5db', borderCollapse: 'collapse' }}>
              <thead style={{ background: 'var(--bg-sidebar)', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-dim)', position: 'sticky', top: 0 }}>
                <tr>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 500 }}>DB ID</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 500 }}>Agent</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 500 }}>Reasoning & Computed Hash</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 500 }}>Risk Level</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 500 }}>On-Chain ID</th>
                </tr>
              </thead>
              <tbody style={{ borderTop: '1px solid var(--border-color)' }}>
                {data.map((row, index) => (
                  <tr key={row.id} style={{ borderBottom: index === data.length - 1 ? 'none' : '1px solid var(--border-color)' }}>
                    <td style={{ padding: '0.75rem 1rem', verticalAlign: 'top' }}>#{row.id}</td>
                    <td style={{ padding: '0.75rem 1rem', verticalAlign: 'top', fontWeight: 600, color: '#60a5fa' }}>
                      {row.agent_name}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', verticalAlign: 'top', maxWidth: '42rem' }}>
                      <div style={{ marginBottom: '0.5rem', color: '#e5e7eb' }}>{row.reasoning}</div>
                      <div style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: 'var(--text-muted)', background: 'rgba(0,0,0,0.3)', padding: '0.5rem', borderRadius: '0.25rem', wordBreak: 'break-all' }}>
                        <span style={{ color: '#c084fc', marginRight: '0.5rem' }}>SHA256:</span>
                        {row.reasoning_hash}
                      </div>
                    </td>
                    <td style={{ padding: '0.75rem 1rem', verticalAlign: 'top' }}>
                      <span style={{
                        padding: '0.25rem 0.5rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 500,
                        background: row.risk_level >= 2 ? 'rgba(127, 29, 29, 0.3)' : 'rgba(20, 83, 45, 0.3)',
                        color: row.risk_level >= 2 ? '#f87171' : '#4ade80',
                        border: `1px solid ${row.risk_level >= 2 ? '#991b1b' : '#166534'}`
                      }}>
                        {row.risk_level >= 2 ? 'HIGH/CRITICAL' : 'LOW'}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem 1rem', verticalAlign: 'top' }}>
                      {row.onchain_entry_id ? (
                        <span style={{ color: '#4ade80', fontFamily: 'monospace' }}>Notarized (#{row.onchain_entry_id})</span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Off-Chain Only</span>
                      )}
                    </td>
                  </tr>
                ))}
                {data.length === 0 && (
                  <tr>
                    <td colSpan="5" style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                      No AI decisions found in the database.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
  );
};

export default DatabaseViewer;
