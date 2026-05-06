import React from 'react';
import { Shield, Activity, ShieldAlert, FileSearch, Settings } from 'lucide-react';

export default function Sidebar() {
  return (
    <div className="glass-panel" style={{ width: '250px', height: 'calc(100vh - 3rem)', position: 'sticky', top: '1.5rem', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '3rem' }}>
        <Shield size={32} className="text-neon-blue animate-fade-in" style={{ filter: 'drop-shadow(0 0 8px rgba(56, 189, 248, 0.6))' }} />
        <h2 className="text-gradient" style={{ fontSize: '1.25rem', margin: 0 }}>Aegis OS</h2>
      </div>

      <nav style={{ display: 'flex', flexDirection: 'column', gap: '1rem', flex: 1 }}>
        <NavItem icon={<Activity />} label="Dashboard" active />
        <NavItem icon={<ShieldAlert />} label="Threat Feed" />
        <NavItem icon={<FileSearch />} label="Claims Audit" />
        <NavItem icon={<Settings />} label="Settings" />
      </nav>

      <div style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--accent-green)', boxShadow: '0 0 8px var(--accent-green)' }}></div>
          <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>System Online</span>
        </div>
      </div>
    </div>
  );
}

function NavItem({ icon, label, active }) {
  return (
    <div 
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '0.75rem 1rem',
        borderRadius: '8px',
        cursor: 'pointer',
        background: active ? 'rgba(56, 189, 248, 0.1)' : 'transparent',
        color: active ? 'var(--text-main)' : 'var(--text-muted)',
        borderLeft: active ? '3px solid var(--accent-blue)' : '3px solid transparent',
        transition: 'all 0.2s ease'
      }}
      onMouseEnter={(e) => {
        if (!active) e.currentTarget.style.color = 'var(--text-main)';
      }}
      onMouseLeave={(e) => {
        if (!active) e.currentTarget.style.color = 'var(--text-muted)';
      }}
    >
      {React.cloneElement(icon, { size: 20, color: active ? 'var(--accent-blue)' : 'currentColor' })}
      <span style={{ fontSize: '1rem', fontWeight: 500 }}>{label}</span>
    </div>
  );
}
