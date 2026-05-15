import React from 'react';
import { LayoutDashboard, Shield, FileText, ScrollText, Link, FilePlus, FileSearch, Activity, Database, Network, Skull } from 'lucide-react';
import { truncAddr } from '../config';

const ADMIN_NAV = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'policies', label: 'Policy Manager', icon: Shield },
  { key: 'claims', label: 'Claims Admin', icon: FileText },
  { key: 'audit', label: 'Audit Trail', icon: ScrollText },
  { key: 'explorer', label: 'Chain Explorer', icon: Link },
  { key: 'activity', label: 'Activity Feed', icon: Activity },
  { key: 'live-network', label: 'Live Network', icon: Network },
  { key: 'db-viewer', label: 'DB Viewer', icon: Database },
  { key: 'threat-simulator', label: 'Threat Simulator', icon: Skull },
];

const CLIENT_NAV = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'file-claim', label: 'File Claim', icon: FilePlus },
  { key: 'my-claims', label: 'My Claims', icon: FileSearch },
  { key: 'activity', label: 'Activity Feed', icon: Activity },
];

export default function Layout({ role, account, currentPage, onNavigate, children }) {
  const navItems = role === 'Admin' ? ADMIN_NAV : CLIENT_NAV;

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar */}
      <aside style={{
        width: 260, padding: '1.5rem', background: 'var(--bg-sidebar)',
        borderRight: '1px solid var(--border-color)', display: 'flex',
        flexDirection: 'column', position: 'fixed', top: 0, left: 0, bottom: 0,
        backdropFilter: 'blur(12px)', zIndex: 10
      }}>
        <div style={{ marginBottom: '2rem' }}>
          <h2 style={{ color: 'var(--accent-blue)', fontFamily: 'var(--font-heading)', fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            🛡️ Aegis OS
          </h2>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '1px', marginTop: '0.25rem' }}>
            {role === 'Admin' ? 'Insurer Console' : 'Company Portal'}
          </div>
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', flex: 1 }}>
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = currentPage === item.key;
            return (
              <button key={item.key} onClick={() => onNavigate(item.key)} style={{
                display: 'flex', alignItems: 'center', gap: '0.75rem',
                padding: '0.7rem 1rem', borderRadius: 'var(--radius-md)',
                background: isActive ? 'rgba(56, 189, 248, 0.1)' : 'transparent',
                color: isActive ? 'var(--accent-blue)' : 'var(--text-muted)',
                border: isActive ? '1px solid rgba(56, 189, 248, 0.15)' : '1px solid transparent',
                fontWeight: isActive ? 600 : 400, cursor: 'pointer',
                transition: 'all 0.2s ease', fontSize: '0.875rem',
                fontFamily: 'var(--font-body)', textAlign: 'left',
              }}>
                <Icon size={18} />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div style={{
          padding: '0.75rem', background: 'rgba(255,255,255,0.03)',
          borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)',
          marginTop: 'auto'
        }}>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginBottom: '0.25rem' }}>Connected Wallet</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--accent-blue)', fontFamily: 'monospace' }}>
            {truncAddr(account)}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main style={{ marginLeft: 260, flex: 1, padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div className="animate-in">
          {children}
        </div>
      </main>
    </div>
  );
}
