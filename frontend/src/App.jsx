import React, { useState, useEffect } from 'react';

const Sidebar = () => {
  const menuItems = ['Dashboard', 'Agents & AI', 'Blockchain Logs', 'Governance', 'Policies', 'Settings'];
  return (
    <aside style={{ width: '240px', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      {menuItems.map((item, i) => (
        <div key={item} style={{
          padding: '0.75rem 1rem',
          borderRadius: '8px',
          cursor: 'pointer',
          background: i === 0 ? 'rgba(0, 123, 255, 0.1)' : 'transparent',
          color: i === 0 ? '#007bff' : '#a1a1aa',
          fontWeight: i === 0 ? 600 : 400,
          marginTop: item === 'Settings' ? 'auto' : '0',
          transition: 'background 0.2s'
        }}>
          {item}
        </div>
      ))}
    </aside>
  );
};

const PostureScore = () => {
  return (
    <div style={{ padding: '1.5rem', textAlign: 'center', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
      <h3 style={{ marginTop: 0, color: '#fff' }}>Security Posture</h3>
      <div style={{ position: 'relative', width: '120px', height: '120px', margin: '1.5rem auto' }}>
        <svg viewBox="0 0 36 36" style={{ transform: 'rotate(-90deg)', width: '100%', height: '100%' }}>
          <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="3" />
          <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#007bff" strokeWidth="3" strokeDasharray="94, 100" />
        </svg>
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fff' }}>94</div>
          <div style={{ fontSize: '0.625rem', opacity: 0.6, color: '#fff' }}>SHS</div>
        </div>
      </div>
      <div style={{ fontSize: '0.875rem', color: '#28a745', fontWeight: 600 }}>Optimal Hygiene</div>
    </div>
  );
};

const SecurityFeed = () => {
  const [alerts] = useState([
    { id: 1, type: 'Info', msg: 'System initialized', ts: 'Just now' },
    { id: 2, type: 'Warning', msg: 'High CPU on Node-A', ts: '2m ago' }
  ]);
  return (
    <div style={{ padding: '1.5rem', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
      <h3 style={{ marginTop: 0, color: '#fff' }}><span style={{ color: '#dc3545' }}>●</span> Live Security Feed</h3>
      <div style={{ height: '300px', overflowY: 'auto' }}>
        {alerts.map(a => (
          <div key={a.id} style={{ marginBottom: '1rem', padding: '0.5rem', borderLeft: '2px solid #007bff' }}>
            <div style={{ fontSize: '0.75rem', color: '#a1a1aa' }}>{a.type} • {a.ts}</div>
            <div style={{ color: '#fff' }}>{a.msg}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

const ClaimsWidget = ({ account }) => {
  const [loading, setLoading] = useState(false);
  const [txHash, setTxHash] = useState("");
  const [tokenBalance, setTokenBalance] = useState("0");
  const [pendingCount, setPendingCount] = useState(0);

  const CLAIMS_PROCESSOR_ABI = [
    "function fileClaim(uint256 breachTimestamp, string attackType, uint256 claimedAmount) public returns (uint256)",
    "function claimCount() view returns (uint256)",
    "function getClaim(uint256) view returns (tuple(address company, uint256 breachTimestamp, string attackType, uint256 claimedAmount, uint8 verdict, uint8 payoutPercentage, uint8 fraudScore, bytes32 fraudReportHash, uint256 processedAt))"
  ];

  const TOKEN_ABI = [
    "function balanceOf(address account) view returns (uint256)"
  ];

  const CLAIMS_PROCESSOR_ADDRESS = "0xB7f8BC63BbcaD18155201308C8f3540b07f84F5e";
  const TOKEN_ADDRESS = "0x0165878A594ca255338adfa4d48449f69242Eb8F";

  useEffect(() => {
    const fetchData = async () => {
      if (!account || !window.ethers || !window.ethereum) return;
      try {
        const ethersLib = window.ethers;
        const provider = new ethersLib.BrowserProvider(window.ethereum);

        // Fetch Balance
        const tokenContract = new ethersLib.Contract(TOKEN_ADDRESS, TOKEN_ABI, provider);
        const balance = await tokenContract.balanceOf(account);
        // formatUnits returns a string representation of the fixed-point number
        setTokenBalance(ethersLib.formatUnits(balance, 18));

        // Fetch Claims Stats
        const claimsContract = new ethersLib.Contract(CLAIMS_PROCESSOR_ADDRESS, CLAIMS_PROCESSOR_ABI, provider);
        const count = await claimsContract.claimCount();
        let pending = 0;

        // Loop through last 5 claims to find pending ones for this user
        const total = Number(count);
        for (let i = Math.max(0, total - 5); i < total; i++) {
          const claim = await claimsContract.getClaim(i);
          // Ethers v6 returns BigInt for enums; use == to compare with number 0 (PENDING)
          if (claim.company.toLowerCase() === account.toLowerCase() && Number(claim.verdict) === 0) {
            pending++;
          }
        }
        setPendingCount(pending);

      } catch (err) {
        console.error("Fetch failed in ClaimsWidget:", err);
      }
    };
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [account, txHash]);

  const handleFileClaim = async () => {
    if (!account) return alert("Please connect MetaMask first!");
    setLoading(true);
    setTxHash("");

    try {
      const ethersLib = window.ethers;
      const provider = new ethersLib.BrowserProvider(window.ethereum);

      const network = await provider.getNetwork();
      if (Number(network.chainId) !== 1337 && Number(network.chainId) !== 31337) {
        await window.ethereum.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: '0x539' }] });
      }

      const signer = await provider.getSigner();
      const contract = new ethersLib.Contract(CLAIMS_PROCESSOR_ADDRESS, CLAIMS_PROCESSOR_ABI, signer);
      const claimAmount = ethersLib.parseEther("1000");

      const tx = await contract.fileClaim(Math.floor(Date.now() / 1000), "Ransomware", claimAmount);
      await tx.wait();
      setTxHash(tx.hash);
    } catch (error) {
      console.error("Transaction Failed:", error);
      alert("Transaction failed! Ensure your account has an active policy.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '1.5rem', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
      <h3 style={{ marginTop: 0, color: '#fff' }}>Insurance Claims</h3>

      <div style={{ background: 'rgba(0, 123, 255, 0.1)', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem', border: '1px solid rgba(0, 123, 255, 0.2)' }}>
        <div style={{ fontSize: '0.75rem', color: '#a1a1aa' }}>Your CIT Balance</div>
        <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#007bff' }}>{parseFloat(tokenBalance).toLocaleString()} CIT</div>
      </div>

      <div style={{ marginTop: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', color: '#fff' }}>
          <span>Pending Claims</span>
          <span style={{ fontWeight: 600, color: pendingCount > 0 ? '#ffc107' : '#fff' }}>{pendingCount}</span>
        </div>

        <button
          onClick={handleFileClaim}
          disabled={loading}
          style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', background: '#007bff', color: 'white', border: 'none', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', transition: 'all 0.2s', opacity: loading ? 0.7 : 1 }}
        >
          {loading ? "Confirming..." : "File Claim (1,000 CIT)"}
        </button>

        {txHash && (
          <div style={{ fontSize: '0.75rem', color: '#28a745', wordBreak: 'break-all', marginTop: '0.5rem', padding: '0.5rem', background: 'rgba(40,167,69,0.1)', borderRadius: '4px' }}>
            Filing Success! Payout pending AI processing.<br />Tx: {txHash}
          </div>
        )}
      </div>
    </div>
  );
};

export default function App() {
  const [account, setAccount] = useState("");

  useEffect(() => {
    if (!window.ethers) {
      const script = document.createElement('script');
      script.src = "https://cdnjs.cloudflare.com/ajax/libs/ethers/6.10.0/ethers.umd.min.js";
      script.async = true;
      document.head.appendChild(script);
    }

    if (window.ethereum) {
      const updateAcc = (accs) => setAccount(accs[0] || "");
      window.ethereum.on('accountsChanged', updateAcc);
      window.ethereum.on('chainChanged', () => window.location.reload());
      window.ethereum.request({ method: 'eth_accounts' }).then(updateAcc);
    }
  }, []);

  const connectWallet = async () => {
    if (!window.ethereum) return alert("Install MetaMask!");
    const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
    setAccount(accounts[0]);
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', padding: '1.5rem', gap: '1.5rem', background: '#0a0a0a', color: '#fff', fontFamily: 'sans-serif' }}>
      <Sidebar />
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ margin: 0 }}>Global Security Command</h1>
            <p style={{ color: '#a1a1aa' }}>Connected: <span style={{ color: '#007bff' }}>{account ? `${account.substring(0, 12)}...` : "None"}</span></p>
          </div>
          <button onClick={connectWallet} style={{ padding: '0.75rem 1.5rem', borderRadius: '8px', background: account ? '#28a745' : '#007bff', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
            {account ? "Wallet Ready" : "Connect MetaMask"}
          </button>
        </header>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '1.5rem' }}>
          <SecurityFeed />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <PostureScore />
            <ClaimsWidget account={account} />
          </div>
        </div>
      </main>
    </div>
  );
}