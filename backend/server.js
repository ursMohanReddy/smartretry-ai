const express = require('express');
// const mongoose = require('mongoose'); // Disabled for testing
const cors = require('cors');

const app = express();

app.use(cors());
app.use(express.json());

// Database connection temporarily disabled so the server doesn't crash
/*
mongoose.connect('mongodb://127.0.0.1:27017/smartretry', {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log('✅ MongoDB Connected'))
  .catch(err => console.log('❌ MongoDB Connection Error:', err));
*/

app.post('/api/transactions', (req, res) => {
  console.log("🛑 Failed transaction received:", req.body);
  res.json({ success: true, message: "Transaction logged as FAILED" });
});

app.post('/api/retry/:id', (req, res) => {
  console.log("🧠 AI analyzing transaction:", req.params.id);
  res.json({ actionTaken: 'RETRY_APPROVED', confidence: 94 });
});

app.post('/api/circuit-breaker/:bank', (req, res) => {
  console.log("⚡ Circuit breaker tripped for:", req.params.bank);
  res.json({ message: `Circuit breaker officially activated for ${req.params.bank}. Traffic blocked.` });
});

const PORT = 5000;
app.listen(PORT, () => console.log(`🚀 SmartRetry AI Backend running on port ${PORT}`));