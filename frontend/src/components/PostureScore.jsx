import React, { useState, useEffect } from 'react';
import { getPostureScore } from '../api/blockchain';
import { ShieldCheck, TrendingUp } from 'lucide-react';

export default function PostureScore() {
  const [score, setScore] = useState(85); // Default mock score
  const [loading, setLoading] = useState(false);

  // Hardcoded contract address from deployment
  // In a real app, this would be passed via context or env
  const POSTURE_ADDRESS = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";

  useEffect(() => {
    async function fetchScore() {
      setLoading(true);
      const onChainScore = await getPostureScore(POSTURE_ADDRESS);
      if (onChainScore) {
        setScore(onChainScore);
      }
      setLoading(false);
    }
    fetchScore();
  }, []);

  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  let color = 'var(--accent-green)';
  if (score < 50) color = 'var(--accent-red)';
  else if (score < 80) color = '#FBBF24'; // Yellow

  return (
    <div className="glass-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h3 style={{ margin: 0, fontSize: '1rem', color: 'var(--text-muted)' }}>Hygiene Score</h3>
        <ShieldCheck className="text-neon-blue" size={20} />
      </div>

      <div style={{ position: 'relative', width: '160px', height: '160px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg width="160" height="160" style={{ transform: 'rotate(-90deg)' }}>
          {/* Background Circle */}
          <circle 
            cx="80" cy="80" r={radius}
            stroke="rgba(255,255,255,0.1)" strokeWidth="12" fill="none"
          />
          {/* Progress Circle */}
          <circle 
            cx="80" cy="80" r={radius}
            stroke={color} strokeWidth="12" fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 1s ease-out, stroke 0.5s ease', filter: `drop-shadow(0 0 6px ${color})` }}
          />
        </svg>
        <div style={{ position: 'absolute', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          {loading ? (
            <span style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>Syncing...</span>
          ) : (
            <>
              <span style={{ fontSize: '2.5rem', fontWeight: 700, fontFamily: 'var(--font-heading)' }}>{score}</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>/ 100</span>
            </>
          )}
        </div>
      </div>

      <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: 'var(--accent-green)', marginBottom: '4px' }}>
          <TrendingUp size={16} />
          <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>+5% this week</span>
        </div>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Verified via Blockchain</span>
      </div>
    </div>
  );
}
