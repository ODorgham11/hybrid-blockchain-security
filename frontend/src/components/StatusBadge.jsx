import React from 'react';

const VERDICT_MAP = {
  0: { label: 'PENDING', cls: 'badge-pending' },
  1: { label: 'APPROVED', cls: 'badge-approved' },
  2: { label: 'PARTIAL', cls: 'badge-partial' },
  3: { label: 'DENIED', cls: 'badge-denied' },
};

const RISK_MAP = {
  0: { label: 'LOW', cls: 'badge-low' },
  1: { label: 'MEDIUM', cls: 'badge-medium' },
  2: { label: 'HIGH', cls: 'badge-high' },
  3: { label: 'CRITICAL', cls: 'badge-critical' },
};

export default function StatusBadge({ value, type = "verdict" }) {
  const map = type === "risk" ? RISK_MAP : VERDICT_MAP;
  const entry = map[Number(value)] || { label: '?', cls: '' };
  return <span className={`badge ${entry.cls}`}>{entry.label}</span>;
}
