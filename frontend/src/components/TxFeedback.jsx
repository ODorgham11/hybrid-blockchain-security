import React from 'react';

export default function TxFeedback({ loading, txHash, error }) {
  if (loading) {
    return (
      <div className="tx-feedback tx-loading">
        <span className="spin">⏳</span> Transaction pending... Please confirm in MetaMask.
      </div>
    );
  }
  if (error) {
    return (
      <div className="tx-feedback tx-error">
        ❌ {error}
      </div>
    );
  }
  if (txHash) {
    return (
      <div className="tx-feedback tx-success">
        <div style={{ fontWeight: 600 }}>✓ Transaction Successful</div>
        <div className="tx-hash">TxHash: {txHash}</div>
      </div>
    );
  }
  return null;
}
