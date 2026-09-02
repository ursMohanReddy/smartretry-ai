import { useState, useEffect, Fragment } from 'react';
import './App.css';

const API_BASE = 'http://localhost:5000';

function App() {
  const [activePage, setActivePage] = useState('Dashboard');

  const [transactions, setTransactions] = useState([]);
  const [logs, setLogs] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [circuitBreakers, setCircuitBreakers] = useState([]);

  const fetchTransactions = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/transactions`);
      const data = await res.json();
      setTransactions(data);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchLogs = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/audit-log`);
      const data = await res.json();
      setLogs(data);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/analytics`);
      const data = await res.json();
      setAnalytics(data);
    } catch (error) {
      console.error(error);
    }
  };
  const fetchCircuitBreakers = async () => {
  try {
    const res = await fetch(`${API_BASE}/api/circuit-breakers`);
    const data = await res.json();
    setCircuitBreakers(data.breakers || []);
  } catch (error) {
    console.error(error);
  }
};

const toggleCircuitBreaker = async (bank, isBlocked) => {
  try {
    const endpoint = isBlocked
      ? `/api/circuit-breaker/${bank}/reset`
      : `/api/circuit-breaker/${bank}`;

    await fetch(`${API_BASE}${endpoint}`, {
      method: 'POST',
    });

    await fetchCircuitBreakers();
  } catch (error) {
    console.error(error);
  }
};

  useEffect(() => {
    fetchTransactions();
    fetchLogs();
    fetchAnalytics();
    fetchCircuitBreakers();
  }, []);

  const runRecoveryAgent = async () => {
    setLoading(true);

    try {
      await fetch(`${API_BASE}/api/recover-all`, {
        method: 'POST',
      });

      await fetchTransactions();
      await fetchLogs();
      await fetchAnalytics();
    } catch (error) {
      console.error(error);
    }

    setLoading(false);
  };

  const totalTransactions = transactions.length;

  const recovered = transactions.filter(
    (t) => t.status === 'RECOVERED'
  ).length;

  const revenueRecovered = transactions
    .filter((t) => t.status === 'RECOVERED')
    .reduce((sum, t) => sum + t.amount, 0);

  const recoveryRate =
    totalTransactions > 0
      ? ((recovered / totalTransactions) * 100).toFixed(1)
      : 0;

  const maxErrorCount =
    analytics?.errors?.length > 0
      ? Math.max(...analytics.errors.map((e) => e.count))
      : 1;

  return (
    <div className="app">

      {/* SIDEBAR */}
      <aside className="sidebar">

        <div className="sidebar-logo">
          <div className="logo-mark">S</div>

          <div>
            <h2>
              SmartRetry <span>AI</span>
            </h2>

            <p>Revenue Recovery Engine</p>
          </div>
        </div>


        <nav className="nav-menu">

          {[
            ['Dashboard', '⌂'],
            ['Recovery Queue', '▣'],
            ['Analytics', '◫'],
            ['Audit Log', '☷'],
            ['Circuit Breakers', '◉'],
          ].map(([name, icon]) => (
            <button
              key={name}
              className={`nav-item ${
                activePage === name ? 'active' : ''
              }`}
              onClick={() => setActivePage(name)}
            >
              <span>{icon}</span>
              {name}
            </button>
          ))}

        </nav>


        <div className="ai-engine">

          <div className="engine-dot"></div>

          <div>
            <h3>AI Engine</h3>
            <p>Autonomous recovery agent</p>

            <span className="engine-status">
              ● ONLINE
            </span>
          </div>

        </div>

      </aside>


      {/* MAIN */}
      <main className="main-content">

        <header className="topbar">

          <div>
            <h1>{activePage}</h1>

            <p>
              {activePage === 'Dashboard'
                ? 'Monitor autonomous payment recovery'
                : activePage === 'Analytics'
                ? 'Recovery intelligence powered by transaction data'
                : 'SmartRetry AI payment recovery platform'}
            </p>
          </div>


          <button
            className="run-agent-btn"
            onClick={runRecoveryAgent}
            disabled={loading}
          >
            {loading
              ? 'Running Recovery Agent...'
              : '▶ Run Recovery Agent'}
          </button>

        </header>


        {/* DASHBOARD */}
        {activePage === 'Dashboard' && (
          <>
            <section className="stats-grid">

              <div className="stat-card">
                <div className="stat-icon">▤</div>

                <div>
                  <p>Total Transactions</p>
                  <h2>{totalTransactions}</h2>
                  <span>Tracked transactions</span>
                </div>
              </div>


              <div className="stat-card">
                <div className="stat-icon purple">✓</div>

                <div>
                  <p>Recovered</p>
                  <h2>{recovered}</h2>
                  <span className="positive">
                    Successfully recovered
                  </span>
                </div>
              </div>


              <div className="stat-card">
                <div className="stat-icon orange">₹</div>

                <div>
                  <p>Revenue Recovered</p>
                  <h2>
                    ₹{revenueRecovered.toLocaleString('en-IN')}
                  </h2>

                  <span className="positive">
                    Revenue protected
                  </span>
                </div>
              </div>


              <div className="stat-card">
                <div className="stat-icon blue">%</div>

                <div>
                  <p>Recovery Rate</p>
                  <h2>{recoveryRate}%</h2>

                  <span>Current performance</span>
                </div>
              </div>

            </section>


            <section className="dashboard-grid">

              <div className="queue-panel">

                <div className="panel-title">
                  <div>
                    <span className="orange-line"></span>
                    <h2>Recovery Queue</h2>
                  </div>

                  <span className="count-badge">
                    {transactions.length} transactions
                  </span>
                </div>


                <div className="table-wrap">

                  <table>

                    <thead>
                      <tr>
                        <th>TXN ID</th>
                        <th>AMOUNT</th>
                        <th>BANK</th>
                        <th>ERROR</th>
                        <th>STATUS</th>
                        <th>RETRIES</th>
                        <th>CONFIDENCE</th>
                      </tr>
                    </thead>


                    <tbody>

                      {transactions.slice(0, 6).map((t) => (

                        <Fragment key={t._id}>

                          <tr>

                            <td className="txn-id">
                              {t.transactionId}
                            </td>

                            <td>
                              ₹{t.amount.toLocaleString('en-IN')}
                            </td>

                            <td>{t.bankName}</td>

                            <td className="error-code">
                              {t.errorCode}
                            </td>

                            <td>
                              <span
                                className={`status-pill ${t.status}`}
                              >
                                {t.status.replace(/_/g, ' ')}
                              </span>
                            </td>

                            <td>
                              {t.retryCount || 0}/3
                            </td>

                            <td className="confidence">
                              {t.recoveryScore || '-'}
                            </td>

                          </tr>


                          {t.lastCustomerMessage && (

                            <tr className="message-row">

                              <td colSpan="7">

                                <div className="customer-note">

                                  <div className="note-pin"></div>

                                  <strong>
                                    Customer Communication
                                  </strong>

                                  <p>
                                    {t.lastCustomerMessage}
                                  </p>

                                </div>

                              </td>

                            </tr>

                          )}

                        </Fragment>

                      ))}

                    </tbody>

                  </table>

                </div>

              </div>


              <aside className="activity-panel">

                <div className="panel-title">

                  <div>
                    <span className="orange-line"></span>
                    <h2>Live Activity</h2>
                  </div>

                  <span className="live-badge">
                    LIVE
                  </span>

                </div>


                <div className="activity-list">

                  {logs.slice(0, 8).map((log, index) => (

                    <div
                      className="activity-item"
                      key={index}
                    >

                      <div className="activity-dot"></div>

                      <div>

                        <span className="activity-time">
                          {new Date(
                            log.timestamp
                          ).toLocaleTimeString()}
                        </span>

                        <p>
                          <strong>
                            {log.transactionId}
                          </strong>

                          <br />

                          {log.details}
                        </p>

                      </div>

                    </div>

                  ))}

                </div>

              </aside>

            </section>
          </>
        )}


        {/* ANALYTICS PAGE */}
        {activePage === 'Analytics' && analytics && (

          <div className="analytics-page">

            <section className="analytics-overview">

              <div className="analytics-card">

                <p>Total Transactions</p>

                <h2>
                  {analytics.overview.totalTransactions}
                </h2>

                <span>
                  Transactions analyzed
                </span>

              </div>


              <div className="analytics-card">

                <p>Recovered Payments</p>

                <h2>
                  {analytics.overview.totalRecovered}
                </h2>

                <span className="positive">
                  Successfully recovered
                </span>

              </div>


              <div className="analytics-card highlight">

                <p>Revenue Recovered</p>

                <h2>
                  ₹
                  {analytics.overview.totalRevenueRecovered.toLocaleString(
                    'en-IN'
                  )}
                </h2>

                <span className="positive">
                  Real revenue saved
                </span>

              </div>


              <div className="analytics-card">

                <p>Recovery Rate</p>

                <h2>
                  {analytics.overview.recoveryRate}%
                </h2>

                <span>
                  Overall agent performance
                </span>

              </div>

            </section>


            <section className="analytics-grid">

              {/* BANK PERFORMANCE */}

              <div className="analytics-panel">

                <div className="analytics-heading">

                  <div>
                    <span className="orange-line"></span>

                    <div>
                      <h2>Bank Recovery Performance</h2>

                      <p>
                        Recovery success rate by payment bank
                      </p>
                    </div>

                  </div>

                </div>


                <div className="bank-list">

                  {analytics.banks.map((bank) => (

                    <div
                      className="bank-item"
                      key={bank.bank}
                    >

                      <div className="bank-info">

                        <div className="bank-name">

                          <strong>
                            {bank.bank}
                          </strong>

                          <span>
                            {bank.recovered} / {bank.total} recovered
                          </span>

                        </div>


                        <strong className="bank-rate">
                          {bank.recoveryRate}%
                        </strong>

                      </div>


                      <div className="progress-track">

                        <div
                          className="progress-fill"
                          style={{
                            width: `${bank.recoveryRate}%`,
                          }}
                        ></div>

                      </div>


                      <div className="bank-revenue">

                        ₹
                        {bank.revenueRecovered.toLocaleString(
                          'en-IN'
                        )}
                        {' '}recovered

                      </div>

                    </div>

                  ))}

                </div>

              </div>


              {/* ERROR DISTRIBUTION */}

              <div className="analytics-panel">

                <div className="analytics-heading">

                  <div>
                    <span className="orange-line"></span>

                    <div>
                      <h2>Error Distribution</h2>

                      <p>
                        Most common payment failure reasons
                      </p>
                    </div>

                  </div>

                </div>


                <div className="error-chart">

                  {analytics.errors.map((item) => {

                    const width =
                      (item.count / maxErrorCount) * 100;

                    return (

                      <div
                        className="error-item"
                        key={item.error}
                      >

                        <div className="error-label">

                          <span>
                            {item.error.replace(/_/g, ' ')}
                          </span>

                          <strong>
                            {item.count}
                          </strong>

                        </div>


                        <div className="error-track">

                          <div
                            className="error-fill"
                            style={{
                              width: `${width}%`,
                            }}
                          ></div>

                        </div>

                      </div>

                    );
                  })}

                </div>

              </div>

            </section>


            {/* AI INSIGHTS */}

            <section className="insights-panel">

              <div className="insight-heading">

                <span className="insight-icon">
                  ✦
                </span>

                <div>
                  <h2>Recovery Intelligence</h2>

                  <p>
                    Insights generated from current transaction patterns
                  </p>
                </div>

              </div>


              <div className="insight-grid">

                <div className="insight-card">

                  <span className="insight-label">
                    TOP FAILURE
                  </span>

                  <h3>
                    {analytics.errors[0]?.error.replace(
                      /_/g,
                      ' '
                    )}
                  </h3>

                  <p>
                    Most frequent payment failure pattern detected.
                  </p>

                </div>


                <div className="insight-card">

                  <span className="insight-label">
                    BEST BANK
                  </span>

                  <h3>
                    {[...analytics.banks]
                      .sort(
                        (a, b) =>
                          b.recoveryRate - a.recoveryRate
                      )[0]?.bank}
                  </h3>

                  <p>
                    Currently showing the strongest recovery performance.
                  </p>

                </div>


                <div className="insight-card orange-insight">

                  <span className="insight-label">
                    AGENT RECOMMENDATION
                  </span>

                  <h3>
                    Focus retry strategy
                  </h3>

                  <p>
                    Prioritize transient failures and optimize retry timing
                    for higher recovery probability.
                  </p>

                </div>

              </div>

            </section>

          </div>
        )}


        {/* PLACEHOLDER PAGES */}

       {activePage === 'Recovery Queue' && (
  <div className="recovery-page">

    <div className="recovery-header">
      <div>
        <h2>Recovery Queue</h2>
        <p>Monitor and inspect every payment recovery decision.</p>
      </div>

      <div className="queue-count">
        {transactions.length} Transactions
      </div>
    </div>

    <div className="recovery-table-card">

      <table className="recovery-table">
        <thead>
          <tr>
            <th>TRANSACTION</th>
            <th>AMOUNT</th>
            <th>BANK</th>
            <th>FAILURE</th>
            <th>STATUS</th>
            <th>AI SCORE</th>
            <th>ACTION</th>
          </tr>
        </thead>

        <tbody>
          {transactions.map((t) => (
            <tr key={t._id}>

              <td>
                <strong className="queue-txn">
                  {t.transactionId}
                </strong>
              </td>

              <td>
                ₹{t.amount.toLocaleString('en-IN')}
              </td>

              <td>{t.bankName}</td>

              <td className="queue-error">
                {t.errorCode}
              </td>

              <td>
                <span className={`status-pill ${t.status}`}>
                  {t.status.replace(/_/g, ' ')}
                </span>
              </td>

              <td>
                <div className="score-box">
                  {t.recoveryScore ?? '-'}
                </div>
              </td>

              <td>
                <button
                  className="trace-btn"
                  onClick={() => {
                    alert(
                      `Decision Trace\n\n` +
                      `Transaction: ${t.transactionId}\n` +
                      `Failure: ${t.errorCode}\n` +
                      `AI Recovery Score: ${t.recoveryScore ?? 'Not calculated'}\n` +
                      `Retries: ${t.retryCount || 0}/3\n` +
                      `Status: ${t.status}\n\n` +
                      `Decision history is available in the Audit Log.`
                    );
                  }}
                >
                  View Trace →
                </button>
              </td>

            </tr>
          ))}
        </tbody>
      </table>

    </div>

  </div>
)}
       {activePage === 'Audit Log' && (
  <div className="audit-page">

    <div className="audit-page-header">
      <div>
        <span className="orange-line"></span>
        <h2>Agent Activity Timeline</h2>
        <p>Complete chronological history of recovery decisions</p>
      </div>

      <button className="refresh-btn" onClick={fetchLogs}>
        ↻ Refresh
      </button>
    </div>

    <div className="audit-summary">
      <div className="audit-stat">
        <span>Total Events</span>
        <h2>{logs.length}</h2>
      </div>

      <div className="audit-stat">
        <span>Transactions Tracked</span>
        <h2>{new Set(logs.map(log => log.transactionId)).size}</h2>
      </div>
    </div>

    <div className="audit-timeline">
      {logs.map((log, index) => (
        <div className="audit-event" key={index}>

          <div className="timeline-marker">
            <div className="timeline-dot"></div>
          </div>

          <div className="audit-event-card">

            <div className="audit-event-top">

              <div className="audit-meta">
                <span className="audit-txn">
                  {log.transactionId}
                </span>

                <span className="audit-action">
                  {log.action?.replace(/_/g, ' ')}
                </span>
              </div>

              <span className="audit-time">
                {new Date(log.timestamp).toLocaleString()}
              </span>

            </div>

            <p>{log.details}</p>

          </div>

        </div>
      ))}
    </div>

  </div>
)}
{activePage === 'Circuit Breakers' && (
  <div className="circuit-page">

    <div className="circuit-header">
      <div>
        <h2>Bank Circuit Breakers</h2>
        <p>Protect payment recovery from repeatedly failing bank services.</p>
      </div>
    </div>

    <div className="circuit-info">
      <span>⚡</span>
      <div>
        <strong>Autonomous Protection Active</strong>
        <p>
          Circuit breakers temporarily stop recovery attempts when a bank
          shows repeated failures.
        </p>
      </div>
    </div>

    <div className="circuit-grid">

      {circuitBreakers.map((breaker) => {

        const bankData = analytics?.banks?.find(
          (item) => item.bank === breaker.bank
        );

        return (
          <div className="circuit-card" key={breaker.bank}>

            <div className="circuit-card-top">

              <div className="bank-circle">
                {breaker.bank.charAt(0)}
              </div>

              <span className={
                breaker.isBlocked
                  ? 'blocked-badge'
                  : 'healthy-badge'
              }>
                ● {breaker.isBlocked ? 'BLOCKED' : 'HEALTHY'}
              </span>

            </div>

            <h3>{breaker.bank}</h3>

            <p className="circuit-subtitle">
              Payment gateway protection
            </p>

            <div className="circuit-stats">

              <div>
                <span>Transactions</span>
                <strong>{bankData?.total || 0}</strong>
              </div>

              <div>
                <span>Recovery Rate</span>
                <strong>{bankData?.recoveryRate || 0}%</strong>
              </div>

            </div>

            <div className="circuit-status">

              <div className="status-line">
                <span>Current Status</span>

                <strong className={
                  breaker.isBlocked
                    ? 'blocked-text'
                    : 'healthy-text'
                }>
                  {breaker.isBlocked
                    ? 'Recovery Paused'
                    : 'Accepting Requests'}
                </strong>
              </div>

              <div className="health-bar">
                <div
                  className={
                    breaker.isBlocked
                      ? 'health-fill blocked-fill'
                      : 'health-fill'
                  }
                  style={{ width: '100%' }}
                ></div>
              </div>

            </div>

            <button
              className={
                breaker.isBlocked
                  ? 'reset-breaker-btn'
                  : 'trip-breaker-btn'
              }
              onClick={() =>
                toggleCircuitBreaker(
                  breaker.bank,
                  breaker.isBlocked
                )
              }
            >
              {breaker.isBlocked
                ? 'Reset Circuit Breaker'
                : 'Trip Circuit Breaker'}
            </button>

          </div>
        );
      })}

    </div>

  </div>
)}
      </main>

    </div>
  );
}

export default App;