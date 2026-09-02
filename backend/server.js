require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const Transaction = require('./src/models/Transaction');
const { processRecoveryAttempt, tripCircuitBreaker } = require('./src/services/retryEngine');

const app = express();
app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB Connected'))
  .catch(err => console.log('❌ MongoDB Connection Error:', err));

// Create a new failed transaction
app.post('/api/transactions', async (req, res) => {
  try {
    const { transactionId, amount, bankName, errorCode } = req.body;
    const txn = new Transaction({ transactionId, amount, bankName, errorCode });
    txn.logs.push({ action: 'CREATED', details: `Failed with ${errorCode}` });
    await txn.save();
    res.json({ success: true, transaction: txn });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Get all transactions (for dashboard table + stats)
app.get('/api/transactions', async (req, res) => {
  const transactions = await Transaction.find().sort({ _id: -1 });
  res.json(transactions);
});

// Run the real AI recovery agent on one transaction
app.post('/api/retry/:transactionId', async (req, res) => {
  try {
    const result = await processRecoveryAttempt(req.params.transactionId);
    res.json(result);
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Run recovery agent on ALL currently failed transactions (the dashboard "trigger" button)
app.post('/api/recover-all', async (req, res) => {
  const failedTxns = await Transaction.find({ status: 'FAILED' });
  const results = [];
  for (const txn of failedTxns) {
    const result = await processRecoveryAttempt(txn.transactionId);
    results.push({ transactionId: txn.transactionId, ...result });
    await new Promise(resolve => setTimeout(resolve, 1500)); // avoid Razorpay rate limit
  }
  res.json({ processedCount: results.length, results });
});

// Trip circuit breaker for a bank
app.post('/api/circuit-breaker/:bank', (req, res) => {
  const message = tripCircuitBreaker(req.params.bank);
  res.json({ message });
});

// Full audit log across all transactions, newest first
app.get('/api/audit-log', async (req, res) => {
  const transactions = await Transaction.find();
  const allLogs = transactions.flatMap(t =>
    t.logs.map(log => ({
      transactionId: t.transactionId,
      action: log.action,
      details: log.details,
      timestamp: log.timestamp
    }))
  );
  allLogs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  res.json(allLogs);
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 SmartRetry AI Backend running on port ${PORT}`));