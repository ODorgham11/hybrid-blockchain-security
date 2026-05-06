import React, { useState } from 'react';
import { analyzeSecurityAlert } from '../api/backend';
import { ShieldAlert, Fingerprint, Activity, CheckCircle } from 'lucide-react';

export default function SecurityFeed() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [feed, setFeed] = useState([
    {
      id: 1,
      type: 'Simulated Threat',
      message: 'Detected lateral movement via WMI from HR desktop to Domain Controller.',
      risk: 'HIGH',
      hash: null,
      status: 'pending'
    }
  ]);

  const handleAnalyze = async (alertItem) => {
    setIsAnalyzing(true);
    try {
      const result = await analyzeSecurityAlert(alertItem.message, "HR desktop shouldn't have admin access.");
      
      setFeed(prev => prev.map(item => 
        item.id === alertItem.id 
        ? { 
            ...item, 
            status: 'resolved', 
            action: result.action,
            hash: result.action_hash,
            entryId: result.entry_id,
            aiRisk: result.risk_level
          }
        : item
      ));
    } catch (error) {
      console.error(error);
      alert("Error analyzing threat. Is the Python backend running?");
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="glass-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0, fontSize: '1.25rem' }}>
          <ShieldAlert className="text-neon-blue" /> Live Security Feed
        </h3>
        <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Powered by Gemini 2.0 Flash</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {feed.map((item) => (
          <div key={item.id} style={{ 
            background: 'rgba(255,255,255,0.02)', 
            border: '1px solid var(--border-color)', 
            borderRadius: '12px', 
            padding: '1.25rem',
            position: 'relative',
            overflow: 'hidden'
          }}>
            {/* Background Glow */}
            {item.status === 'resolved' && (
              <div style={{ 
                position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', 
                background: 'var(--accent-blue)', boxShadow: '0 0 12px var(--accent-blue-glow)' 
              }} />
            )}
            
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--accent-red)' }}>{item.type}</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Just now</span>
            </div>
            
            <p style={{ margin: '0 0 1rem 0', fontSize: '1rem', lineHeight: 1.5 }}>
              {item.message}
            </p>

            {item.status === 'pending' ? (
              <button 
                onClick={() => handleAnalyze(item)}
                disabled={isAnalyzing}
                style={{
                  background: isAnalyzing ? 'transparent' : 'var(--accent-blue)',
                  border: isAnalyzing ? '1px solid var(--accent-blue)' : 'none',
                  color: isAnalyzing ? 'var(--accent-blue)' : '#000',
                  padding: '0.5rem 1rem',
                  borderRadius: '6px',
                  fontWeight: 600,
                  cursor: isAnalyzing ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'all 0.2s ease'
                }}
              >
                <Activity size={16} className={isAnalyzing ? 'animate-pulse' : ''} />
                {isAnalyzing ? 'AI Analyzing...' : 'Analyze with AI'}
              </button>
            ) : (
              <div className="animate-fade-in" style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ display: 'flex', gap: '1rem', marginBottom: '0.5rem' }}>
                  <div style={{ flex: 1 }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>AI Decision</span>
                    <span style={{ fontSize: '0.875rem', color: 'var(--text-main)' }}>{item.action}</span>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Assessed Risk</span>
                    <span style={{ fontSize: '0.875rem', color: 'var(--accent-red)', fontWeight: 600 }}>{item.aiRisk}</span>
                  </div>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(0,0,0,0.2)', padding: '0.5rem 0.75rem', borderRadius: '6px', marginTop: '0.75rem' }}>
                  <Fingerprint size={16} className="text-neon-blue" />
                  <div style={{ flex: 1, overflow: 'hidden' }}>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block' }}>Blockchain Anchored Hash (Entry #{item.entryId})</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--accent-blue)', fontFamily: 'monospace', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block' }}>
                      {item.hash}
                    </span>
                  </div>
                  <CheckCircle size={16} color="var(--accent-green)" />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
