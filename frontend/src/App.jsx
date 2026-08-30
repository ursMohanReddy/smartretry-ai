import { useState } from 'react';
import axios from 'axios';

function App() {
  const [log, setLog] = useState("Dashboard Ready. Waiting for action...");

  const simulateFailure = async () => {
    try {
      setLog("1. Creating a failed transaction...");
      await axios.post('http://localhost:5000/api/transactions', {
        transactionId: `TXN-${Math.floor(Math.random() * 1000)}`,
        amount: 1500,
        bankName: 'HDFC',
        errorCode: 'ERR_BANK_TIMEOUT'
      });
      setLog("✅ Failed transaction created. Ready for AI Retry.");
    } catch (error) {
      setLog("❌ Error: Is your backend server running?");
    }
  };

  const triggerAI = async () => {
    try {
      setLog("2. AI analyzing transaction...");
      const res = await axios.post('http://localhost:5000/api/retry/TXN-001');
      setLog(`🤖 AI Decision: ${res.data.actionTaken} | Confidence: ${res.data.confidence}%`);
    } catch (error) {
      setLog("❌ AI Analysis failed.");
    }
  };

  const tripCircuit = async () => {
    try {
      setLog("🛑 Tripping Global Circuit Breaker for HDFC...");
      const res = await axios.post('http://localhost:5000/api/circuit-breaker/HDFC');
      setLog(`⚡ ${res.data.message}`);
    } catch (error) {
      setLog("❌ Failed to trip circuit breaker.");
    }
  };

  return (
    <div style={{ padding: '40px', fontFamily: 'Arial' }}>
      <h1>🧠 SmartRetry AI Dashboard</h1>
      <p>Revenue Recovery & Protection System</p>
      
      <div style={{ margin: '20px 0', padding: '20px', border: '1px solid #ccc', borderRadius: '8px' }}>
        <h3>System Logs</h3>
        <p style={{ fontFamily: 'monospace', color: 'blue' }}>{log}</p>
      </div>

      <div style={{ display: 'flex', gap: '10px' }}>
        <button onClick={simulateFailure} style={{ padding: '10px', cursor: 'pointer' }}>
          1. Simulate Payment Failure
        </button>
        <button onClick={triggerAI} style={{ padding: '10px', cursor: 'pointer', backgroundColor: '#4CAF50', color: 'white' }}>
          2. Run AI Recovery
        </button>
        <button onClick={tripCircuit} style={{ padding: '10px', cursor: 'pointer', backgroundColor: '#f44336', color: 'white' }}>
          3. Trip HDFC Circuit Breaker
        </button>
      </div>
    </div>
  );
}

export default App;