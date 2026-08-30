import { useState, useEffect } from 'react';
import './App.css';

const API_BASE = 'http://localhost:5000';

function App() {
  const [transactions, setTransactions] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchTransactions = async () => {
    const res = await fetch(`${API_BASE}/api/transactions`);
    const data = await res.json();
    setTransactions(data);
  };

  const fetchLogs = async () => {
    const res = await fetch(`${API_BASE}/api/audit-log`);
    const data = await res.json();
    setLogs(data);
  };

  useEffect(() => {
    fetchTransactions();
    fetchLogs();
  }, []);

  const runRecoveryAgent = async () => {
    setLoading(true);
    await fetch(`${API_BASE}/api/recover-all`, { method: 'POST' });
    await fetchTransactions();
    await fetchLogs();
    setLoading(false);
  };

  const totalFailed = transactions.length;
  const recovered = transactions.filter(t => t.status === 'RECOVERED').length;
  const revenueRecovered = transactions
    .filter(t => t.status === 'RECOVERED')
    .reduce((sum, t) => sum + t.amount, 0);
  const recoveryRate = totalFailed ? Math.round((recovered / totalFailed) * 100) : 0;

  return (
    <div className="dashboard">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark"></div>
          <div>
            <h1>SmartRetry AI</h1>
            <p className="subtitle">Revenue recovery for failed payments</p>
          </div>
        </div>
        <button className="trigger-btn" onClick={runRecoveryAgent} disabled={loading}>
          {loading ? 'Running...' : 'Run Recovery Agent'}
        </button>
      </header>

      <section className="stats">
        <div className="stat-card">
          <p>Total Failed</p>
          <h2>{totalFailed}</h2>
        </div>
        <div className="stat-card">
          <p>Recovered</p>
          <h2>{recovered}</h2>
        </div>
        <div className="stat-card">
          <p>Revenue Recovered</p>
          <h2>₹{revenueRecovered.toLocaleString('en-IN')}</h2>
        </div>
        <div className="stat-card">
          <p>Recovery Rate</p>
          <h2>{recoveryRate}%</h2>
        </div>
      </section>

      <section className="main-grid">
        <div className="panel">
          <h3>Transactions</h3>
          <table>
            <thead>
              <tr>
                <th>Txn ID</th>
                <th>Amount</th>
                <th>Bank</th>
                <th>Error</th>
                <th>Status</th>
                <th>Retries</th>
                <th>Confidence</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map(t => (
                <tr key={t._id} className={`status-${t.status}`}>
                  <td>{t.transactionId}</td>
                  <td>₹{t.amount.toLocaleString('en-IN')}</td>
                  <td>{t.bankName}</td>
                  <td>{t.errorCode}</td>
                  <td><span className="status-pill">{t.status.replace(/_/g, ' ')}</span></td>
                  <td>{t.retryCount}/3</td>
                  <td>{t.recoveryScore || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="panel">
          <h3>Live Activity Log</h3>
          <div className="activity-log">
            {logs.map((log, i) => (
              <div className="log-entry" key={i}>
                <span className="log-time">
                  {new Date(log.timestamp).toLocaleTimeString()}
                </span>
                — <strong>{log.transactionId}</strong>: {log.details}
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

export default App;