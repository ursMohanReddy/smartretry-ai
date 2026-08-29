// backend/test2.js

async function runOutageTest() {
  console.log("🛑 1. BANK OUTAGE DETECTED: Tripping Global Circuit Breaker for HDFC...");
  await fetch('http://localhost:5000/api/circuit-breaker/HDFC', { method: 'POST' });

  console.log("🔄 2. AI attempting to recover the HDFC transaction...\n");
  const response = await fetch('http://localhost:5000/api/retry/TXN-001', { method: 'POST' });
  const result = await response.json();
  
  console.log("🤖 AI AGENT DECISION:");
  console.log(result);
}

runOutageTest();
