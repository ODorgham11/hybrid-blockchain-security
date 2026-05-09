import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';

// Components
import LoginAuth from './components/LoginAuth';
import Layout from './components/Layout';

// Admin Pages
import AdminDashboard from './pages/admin/AdminDashboard';
import PolicyManager from './pages/admin/PolicyManager';
import ClaimsAdmin from './pages/admin/ClaimsAdmin';
import AuditTrail from './pages/admin/AuditTrail';
import ChainExplorer from './pages/admin/ChainExplorer';
import AdminActivityFeed from './pages/admin/ActivityFeed';

// Client Pages
import ClientDashboard from './pages/client/ClientDashboard';
import FileClaim from './pages/client/FileClaim';
import MyClaims from './pages/client/MyClaims';
import ClientActivityFeed from './pages/client/ActivityFeed';

export default function App() {
  const [account, setAccount] = useState("");
  const [role, setRole] = useState("");
  const [provider, setProvider] = useState(null);
  const [currentPage, setCurrentPage] = useState("dashboard");

  useEffect(() => {
    if (window.ethereum) {
      const prov = new ethers.BrowserProvider(window.ethereum);
      setProvider(prov);
      window.ethereum.on('accountsChanged', () => window.location.reload());
      window.ethereum.on('chainChanged', () => window.location.reload());
    }
  }, []);

  const handleLogin = (acc, r) => {
    setAccount(acc);
    setRole(r);
    setCurrentPage("dashboard");
  };

  if (!account) {
    return <LoginAuth onLogin={handleLogin} />;
  }

  // Page router
  const renderPage = () => {
    if (role === "Admin") {
      switch (currentPage) {
        case 'dashboard': return <AdminDashboard provider={provider} />;
        case 'policies': return <PolicyManager provider={provider} />;
        case 'claims': return <ClaimsAdmin provider={provider} />;
        case 'audit': return <AuditTrail provider={provider} />;
        case 'explorer': return <ChainExplorer provider={provider} />;
        case 'activity': return <AdminActivityFeed />;
        default: return <AdminDashboard provider={provider} />;
      }
    } else {
      switch (currentPage) {
        case 'dashboard': return <ClientDashboard provider={provider} account={account} />;
        case 'file-claim': return <FileClaim provider={provider} />;
        case 'my-claims': return <MyClaims provider={provider} account={account} onNavigate={setCurrentPage} />;
        case 'activity': return <ClientActivityFeed account={account} />;
        default: return <ClientDashboard provider={provider} account={account} />;
      }
    }
  };

  return (
    <Layout role={role} account={account} currentPage={currentPage} onNavigate={setCurrentPage}>
      {renderPage()}
    </Layout>
  );
}