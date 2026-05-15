import React, { useState, useEffect, useRef } from 'react';
import { ethers } from 'ethers';
import { getContract, truncHash } from '../../config';
import { Network, Activity, ShieldCheck, AlertOctagon } from 'lucide-react';

const LiveChainVisualizer = ({ provider }) => {
  const [events, setEvents] = useState([]);
  const [isListening, setIsListening] = useState(false);
  const eventsEndRef = useRef(null);

  // Auto-scroll to bottom
  useEffect(() => {
    eventsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [events]);

  useEffect(() => {
    const setupListeners = async () => {
      try {
        // Use a direct WebSocket provider to Hardhat instead of MetaMask's HTTP provider
        const wsProvider = new ethers.WebSocketProvider("ws://127.0.0.1:8545");
        
        const auditContract = getContract("AuditRegistry", wsProvider);
        const claimsContract = getContract("ClaimsProcessor", wsProvider);
        const govContract = getContract("Governance", wsProvider);

        const addEvent = (type, data, riskLevel = 'INFO') => {
          setEvents(prev => [...prev, {
            id: Math.random().toString(),
            timestamp: new Date().toISOString(),
            type,
            data,
            riskLevel
          }]);
        };

        // ── AuditRegistry Events
        auditContract.on("ActionLogged", (id, actionHash, risk, ev) => {
          const riskStr = Number(risk) === 3 ? 'CRITICAL' : Number(risk) === 2 ? 'HIGH' : 'LOW';
          addEvent("ActionLogged", `[AI Audit] Entry #${id} Notarized | Hash: ${truncHash(actionHash)} | Risk: ${riskStr}`, riskStr);
        });

        // ── ClaimsProcessor Events
        claimsContract.on("ClaimFiled", (claimId, company, amount, ev) => {
          addEvent("ClaimFiled", `[Claim] New Claim #${claimId} from ${company.slice(0,6)}... | Amount: ${ethers.formatUnits(amount, 18)} CIT`);
        });

        claimsContract.on("FraudScoreRecorded", (claimId, fraudScore, ev) => {
          const risk = Number(fraudScore) >= 75 ? 'CRITICAL' : Number(fraudScore) >= 50 ? 'HIGH' : 'INFO';
          addEvent("FraudScore", `[Fraud DB] Claim #${claimId} scored ${fraudScore}/100`, risk);
        });

        claimsContract.on("ClaimProcessed", (claimId, verdict, payout, ev) => {
          const vStr = Number(verdict) === 0 ? 'APPROVED' : Number(verdict) === 1 ? 'PARTIAL' : 'DENIED';
          addEvent("ClaimProcessed", `[Execution] Claim #${claimId} final verdict: ${vStr} | Payout: ${ethers.formatUnits(payout, 18)} CIT`);
        });

        // ── Governance Events
        govContract.on("ApprovalRequested", (entryId, ev) => {
          addEvent("GovRequest", `[Governance] Multi-sig requested for Entry #${entryId}`, "HIGH");
        });

        govContract.on("ActionApproved", (entryId, approver, ev) => {
          addEvent("GovApprove", `[Governance] Entry #${entryId} APPROVED by ${approver.slice(0,6)}...`);
        });

        setIsListening(true);

        return () => {
          auditContract.removeAllListeners();
          claimsContract.removeAllListeners();
          govContract.removeAllListeners();
          setIsListening(false);
          wsProvider.destroy();
        };
      } catch (err) {
        console.error("Failed to setup listeners:", err);
      }
    };

    setupListeners();
  }, [provider]);

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <div>
            <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold', color: '#4ade80', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', fontFamily: 'monospace' }}>
              <Network size={32} /> LIVE_CHAIN_STREAM
            </h1>
            <p style={{ color: 'var(--text-muted)' }}>
              Direct WebSocket connection to the Hardhat network. Bypassing SQLite backend.
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', background: 'rgba(0,0,0,0.4)', border: '1px solid #14532d', borderRadius: '0.25rem', color: '#4ade80', fontFamily: 'monospace', fontSize: '0.875rem', boxShadow: '0 0 15px rgba(34,197,94,0.2)' }}>
            <span style={{ position: 'relative', display: 'flex', height: '0.75rem', width: '0.75rem' }}>
              {isListening && <span style={{ position: 'absolute', display: 'inline-flex', height: '100%', width: '100%', borderRadius: '9999px', background: '#4ade80', opacity: 0.75, animation: 'ping 1s cubic-bezier(0, 0, 0.2, 1) infinite' }}></span>}
              <span style={{ position: 'relative', display: 'inline-flex', borderRadius: '9999px', height: '0.75rem', width: '0.75rem', background: '#22c55e' }}></span>
            </span>
            {isListening ? 'WSS CONNECTED' : 'CONNECTING...'}
          </div>
        </header>

        <div style={{ background: 'black', border: '1px solid var(--border-color)', borderRadius: '0.5rem', height: '600px', overflow: 'hidden', display: 'flex', flexDirection: 'column', fontFamily: 'monospace', fontSize: '0.875rem', position: 'relative', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}>
          {/* Matrix-like overlay effect */}
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(rgba(0,255,0,0.03) 1px, transparent 1px)', backgroundSize: '100% 4px', pointerEvents: 'none', zIndex: 10 }} />
          
          <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', zIndex: 20 }}>
            {events.length === 0 ? (
              <div style={{ color: '#14532d', marginTop: '1rem', animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' }}>
                Listening for block events... Trigger an action in the Threat Simulator to see it here.
              </div>
            ) : (
              events.map(ev => {
                let colorClass = "#22c55e";
                let bgClass = "transparent";
                if (ev.riskLevel === 'CRITICAL') { colorClass = "#ef4444"; bgClass = "rgba(127,29,29,0.1)"; }
                if (ev.riskLevel === 'HIGH') colorClass = "#eab308";

                return (
                  <div key={ev.id} style={{ padding: '0.5rem', borderRadius: '0.25rem', display: 'flex', gap: '1rem', color: colorClass, background: bgClass, border: '1px solid transparent', transition: 'all 0.2s' }}>
                    <span style={{ opacity: 0.5, width: '12rem', flexShrink: 0 }}>
                      {ev.timestamp.split('T')[1].slice(0,-1)}
                    </span>
                    <span style={{ fontWeight: 'bold', opacity: 0.75, width: '8rem', flexShrink: 0 }}>
                      [{ev.type}]
                    </span>
                    <span style={{ flex: 1, wordBreak: 'break-all' }}>
                      {ev.data}
                    </span>
                  </div>
                );
              })
            )}
            <div ref={eventsEndRef} />
          </div>
        </div>
      </div>
  );
};

export default LiveChainVisualizer;
