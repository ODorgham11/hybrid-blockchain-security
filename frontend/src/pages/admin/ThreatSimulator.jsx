import React, { useState } from 'react';
import { analyzeSecurityAlert, processClaim, analyzeDailyLogs } from '../../api/backend';
import { Skull, ShieldAlert, FileWarning, Search, Activity, Cpu } from 'lucide-react';

const THREAT_SCENARIOS = {
  security: [
    {
      name: 'Ransomware Payload',
      description: 'Simulate a high-volume file encryption attack.',
      payload: '[CRITICAL] High volume of file encryption events detected on C:\\Shared\\Financials. Unknown binary "encryptor.exe" executing. High CPU usage.',
      context: 'Internal Financial Server',
    },
    {
      name: 'Insider Privilege Escalation',
      description: 'Simulate an employee accessing unauthorized servers.',
      payload: '[HIGH] User "hr_admin" attempted to access the database core server outside of normal working hours via SSH.',
      context: 'HR Department Subnet',
    },
    {
      name: 'DDoS & WAF Bypass',
      description: 'Simulate a massive traffic spike.',
      payload: '[HIGH] Incoming traffic spike detected. 500,000 requests per second targeting the frontend IP. WAF rules failing to filter.',
      context: 'Public Web Gateway',
    }
  ],
  smart_contract: [
    {
      name: 'Reentrancy Attack',
      description: 'Simulate a malicious contract attempting recursive calls.',
      payload: '[CRITICAL] Smart Contract Call Detected. Source: 0xMalicious calling ClaimsProcessor.processClaim. Call stack indicates potential recursive fallback loop (Reentrancy pattern matched).',
      context: 'Ethereum RPC Node Monitor',
    },
    {
      name: 'Flash Loan / Oracle Manipulation',
      description: 'Simulate a flash loan altering prices before a claim.',
      payload: '[CRITICAL] Flash loan of 10,000 ETH executed. Price oracle deviation of 45% detected in a single block right before a massive insurance claim submission.',
      context: 'DeFi Threat Intel Feed',
    },
    {
      name: 'Access Control Bypass',
      description: 'Simulate an unprivileged user calling an admin function.',
      payload: '[HIGH] Unprivileged wallet 0xHacker attempted to call protected function "updatePolicy" in PolicyEngine.sol without the onlyInsurer role.',
      context: 'Smart Contract Audit Logs',
    }
  ],
  fraud: [
    {
      name: 'Sybil Attack Claim',
      description: 'Simulate a claim from a known malicious proxy.',
      payload: JSON.stringify({ claim_amount: 5000000, incident: "Supply chain interruption", evidence_links: ["http://fake-weather.com"], submitter_ip: "192.168.1.1 (known proxy)" }, null, 2),
      context: 'Low', // Historical posture
    },
    {
      name: 'Double Spend Claim',
      description: 'Simulate submitting the exact same invoice twice.',
      payload: JSON.stringify({ claim_amount: 10000, incident: "Medical billing", invoice_id: "INV-1002 (PAID YESTERDAY)" }, null, 2),
      context: 'Medium',
    }
  ]
};

const ThreatSimulator = () => {
  const [activeTab, setActiveTab] = useState('security');
  const [customPayload, setCustomPayload] = useState('');
  const [customContext, setCustomContext] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleLaunch = async (scenario) => {
    setLoading(true);
    setResult(null);
    try {
      let res;
      if (activeTab === 'security' || activeTab === 'smart_contract') {
        res = await analyzeSecurityAlert(scenario.payload || customPayload, scenario.context || customContext);
      } else if (activeTab === 'fraud') {
        res = await processClaim(Math.floor(Math.random() * 1000), scenario.payload || customPayload, scenario.context || customContext);
      }
      setResult(res);
    } catch (err) {
      setResult({ error: 'Failed to contact backend.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <header>
          <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <Skull size={32} /> Threat Simulator (Penetration Testing)
          </h1>
          <p style={{ color: 'var(--text-muted)' }}>
            Inject malicious payloads and smart contract vulnerabilities directly into the AI agents to test defensive capabilities and conditional on-chain logging.
          </p>
        </header>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
          {['security', 'smart_contract', 'fraud', 'custom'].map((tab) => {
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  padding: '0.5rem 1rem', borderTopLeftRadius: '0.375rem', borderTopRightRadius: '0.375rem', fontWeight: 500, textTransform: 'capitalize', cursor: 'pointer',
                  background: isActive ? 'rgba(127, 29, 29, 0.2)' : 'transparent',
                  color: isActive ? '#f87171' : 'var(--text-dim)',
                  borderBottom: isActive ? '2px solid #ef4444' : 'none',
                  border: 'none', borderBottomWidth: isActive ? '2px' : 0, borderBottomStyle: 'solid', borderBottomColor: isActive ? '#ef4444' : 'transparent'
                }}
              >
                {tab.replace('_', ' ')}
              </button>
            )
          })}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem' }}>
          {/* Left Column: Attack Vectors */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {activeTab !== 'custom' && THREAT_SCENARIOS[activeTab].map((scenario, idx) => (
              <div key={idx} style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '0.5rem', padding: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                  <h3 style={{ fontSize: '1.125rem', fontWeight: 'bold', color: '#e5e7eb', margin: 0 }}>{scenario.name}</h3>
                  <button
                    onClick={() => handleLaunch(scenario)}
                    disabled={loading}
                    style={{ background: '#dc2626', color: 'white', padding: '0.25rem 0.75rem', borderRadius: '0.25rem', fontSize: '0.875rem', fontWeight: 600, border: 'none', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.5 : 1 }}
                  >
                    Launch
                  </button>
                </div>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '0.75rem', marginTop: 0 }}>{scenario.description}</p>
                <div style={{ background: 'rgba(0,0,0,0.5)', padding: '0.5rem', borderRadius: '0.25rem', fontSize: '0.75rem', fontFamily: 'monospace', color: '#f87171', wordBreak: 'break-all' }}>
                  {scenario.payload}
                </div>
              </div>
            ))}

            {activeTab === 'custom' && (
              <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '0.5rem', padding: '1rem' }}>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 'bold', color: '#e5e7eb', marginBottom: '1rem', marginTop: 0 }}>Custom Zero-Day Injector</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Payload / Alert Text</label>
                    <textarea
                      value={customPayload}
                      onChange={(e) => setCustomPayload(e.target.value)}
                      style={{ width: '100%', background: 'rgba(0,0,0,0.5)', border: '1px solid var(--border-color)', borderRadius: '0.25rem', padding: '0.5rem', color: '#f87171', fontFamily: 'monospace', fontSize: '0.875rem', height: '8rem', outline: 'none' }}
                      placeholder="Enter custom attack signature or JSON..."
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>System Context</label>
                    <input
                      type="text"
                      value={customContext}
                      onChange={(e) => setCustomContext(e.target.value)}
                      style={{ width: '100%', background: 'rgba(0,0,0,0.5)', border: '1px solid var(--border-color)', borderRadius: '0.25rem', padding: '0.5rem', color: '#d1d5db', fontSize: '0.875rem', outline: 'none' }}
                      placeholder="e.g., Target Server IP, Network Zone..."
                    />
                  </div>
                  <button
                    onClick={() => handleLaunch({})}
                    disabled={loading || !customPayload}
                    style={{ width: '100%', background: '#dc2626', color: 'white', padding: '0.5rem', borderRadius: '0.25rem', fontWeight: 'bold', border: 'none', cursor: (loading || !customPayload) ? 'not-allowed' : 'pointer', opacity: (loading || !customPayload) ? 0.5 : 1 }}
                  >
                    Execute Zero-Day Attack
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: AI Defense Response */}
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '0.5rem', padding: '1.5rem', display: 'flex', flexDirection: 'column', minHeight: '400px' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#e5e7eb', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: 0 }}>
              <ShieldAlert size={24} color="#60a5fa" />
              AI Defense Response
            </h2>
            
            {loading ? (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#60a5fa' }}>
                <Cpu size={48} style={{ marginBottom: '1rem' }} />
                <p>Analyzing Payload Vectors...</p>
              </div>
            ) : result ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', flex: 1 }}>
                {result.error ? (
                  <div style={{ color: '#ef4444', background: 'rgba(127, 29, 29, 0.2)', padding: '1rem', borderRadius: '0.25rem', border: '1px solid #7f1d1d' }}>
                    {result.error}
                  </div>
                ) : (
                  <>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                      <div style={{ background: 'var(--bg-sidebar)', padding: '0.75rem', borderRadius: '0.25rem', border: '1px solid var(--border-color)' }}>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Risk / Fraud Score</div>
                        <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: (result.risk_level >= 2 || result.fraud_score >= 50) ? '#ef4444' : '#22c55e' }}>
                          {result.risk_level !== undefined ? `Level ${result.risk_level}` : `${result.fraud_score}/100`}
                        </div>
                      </div>
                      <div style={{ background: 'var(--bg-sidebar)', padding: '0.75rem', borderRadius: '0.25rem', border: '1px solid var(--border-color)' }}>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Notarization Status</div>
                        <div style={{ fontSize: '0.875rem', fontWeight: 'bold', color: result.notarization === 'queued' || result.risk_level >= 2 || result.fraud_score >= 50 ? '#4ade80' : '#9ca3af' }}>
                          {result.notarization === 'queued' || result.risk_level >= 2 || result.fraud_score >= 50 ? 'On-Chain (Critical)' : 'Off-Chain Only (Low)'}
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>AI Reasoning Engine</div>
                      <div style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid var(--border-color)', padding: '0.75rem', borderRadius: '0.25rem', fontSize: '0.875rem', color: '#d1d5db' }}>
                        {result.reasoning || result.report}
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Defensive Action Taken</div>
                      <div style={{ background: 'rgba(30, 58, 138, 0.2)', border: '1px solid #1e3a8a', padding: '0.75rem', borderRadius: '0.25rem', fontSize: '0.875rem', color: '#60a5fa', fontWeight: 'bold' }}>
                        {result.action || result.recommended_action || `Status: ${result.success ? 'PASSED' : 'REJECTED'}`}
                      </div>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                <Search size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
                <p>Awaiting attack payload injection...</p>
              </div>
            )}
          </div>
        </div>
      </div>
  );
};

export default ThreatSimulator;
