import React, { useState } from 'react';
import { ADMIN_ADDRESS } from '../config';

export default function LoginAuth({ onLogin }) {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState(1);

  const handleSendCode = () => {
    if (email.includes("@")) setStep(2);
    else alert("Please enter a valid email address.");
  };

  const handleVerify2FA = () => {
    if (code === "123456") setStep(3);
    else alert("Invalid 2FA code. Hint: 123456");
  };

  const handleConnectWallet = async () => {
    if (!window.ethereum) return alert("Please install MetaMask!");
    try {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      const acc = accounts[0];
      const role = acc.toLowerCase() === ADMIN_ADDRESS.toLowerCase() ? "Admin" : "Client";
      onLogin(acc, role);
    } catch (err) {
      alert("MetaMask connection failed: " + err.message);
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', background: '#020617' }}>
      <div style={{ width: '420px' }} className="animate-in">
        <div className="glass-panel">
          <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🛡️</div>
            <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.5rem' }}>Aegis OS</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Hybrid AI & Blockchain Security</p>
          </div>

          {step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Corporate Email</label>
                <input type="email" className="form-input" placeholder="user@company.com" value={email} onChange={e => setEmail(e.target.value)} />
              </div>
              <button className="btn btn-primary btn-block" onClick={handleSendCode}>Send 2FA Code</button>
            </div>
          )}

          {step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', textAlign: 'center' }}>Code sent to <strong style={{ color: 'var(--accent-blue)' }}>{email}</strong></div>
              <div className="form-group">
                <label className="form-label">Verification Code</label>
                <input type="text" className="form-input" placeholder="Enter 6-digit code" value={code} onChange={e => setCode(e.target.value)} style={{ textAlign: 'center', letterSpacing: '4px' }} />
              </div>
              <button className="btn btn-primary btn-block" onClick={handleVerify2FA}>Verify</button>
            </div>
          )}

          {step === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', textAlign: 'center' }}>
              <div style={{ color: 'var(--accent-green)', fontWeight: 600 }}>✓ Email Verified</div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Connect your Web3 identity to access your role-based dashboard.</p>
              <button className="btn btn-success btn-block" onClick={handleConnectWallet}>🦊 Connect MetaMask</button>
            </div>
          )}

          <div style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.7rem', color: 'var(--text-dim)' }}>
            Step {step} of 3 — {step === 1 ? 'Identity' : step === 2 ? 'Verification' : 'Web3 Auth'}
          </div>
        </div>
      </div>
    </div>
  );
}
