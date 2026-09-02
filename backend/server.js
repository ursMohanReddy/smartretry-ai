require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const Transaction = require('./src/models/Transaction');
const {
  processRecoveryAttempt,
  tripCircuitBreaker,
} = require('./src/services/retryEngine');

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

    const txn = new Transaction({
      transactionId,
      amount,
      bankName,
      errorCode,
    });

    txn.logs.push({
      action: 'CREATED',
      details: `Failed with ${errorCode}`,
    });

    await txn.save();

    res.json({
      success: true,
      transaction: txn,
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      error: err.message,
    });
  }
});


// Get all transactions
app.get('/api/transactions', async (req, res) => {
  try {
    const transactions = await Transaction.find().sort({ _id: -1 });
    res.json(transactions);
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});


// Run recovery agent on one transaction
app.post('/api/retry/:transactionId', async (req, res) => {
  try {
    const result = await processRecoveryAttempt(
      req.params.transactionId
    );

    res.json({
      success: true,
      data: result,
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      error: err.message,
    });
  }
});


// Run recovery agent on all FAILED transactions
app.post('/api/recover-all', async (req, res) => {
  try {
    const failedTxns = await Transaction.find({
      status: 'FAILED',
    });

    const results = [];

    for (const txn of failedTxns) {
      try {
        const result = await processRecoveryAttempt(
          txn.transactionId
        );

        results.push({
          transactionId: txn.transactionId,
          success: true,
          ...result,
        });

        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error) {
        results.push({
          transactionId: txn.transactionId,
          success: false,
          error: error.message,
        });
      }
    }

    res.json({
      success: true,
      processedCount: results.length,
      results,
    });

  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});


// Simulated payment gateway webhook
// In production, Razorpay/Stripe would call this endpoint
app.post('/api/webhook/payment-success', async (req, res) => {
  try {
    const { transactionId, paymentId } = req.body;

    if (!transactionId || !paymentId) {
      return res.status(400).json({
        success: false,
        error: 'transactionId and paymentId are required',
      });
    }

    const transaction = await Transaction.findOne({
      transactionId,
    });

    if (!transaction) {
      return res.status(404).json({
        success: false,
        error: 'Transaction not found',
      });
    }

    // Idempotency: don't process the same successful payment twice
    if (transaction.status === 'RECOVERED') {
      return res.status(200).json({
        success: true,
        message: 'Payment already processed',
        transaction,
      });
    }

    // Only recovery transactions can be confirmed
    if (transaction.status !== 'AWAITING_CONFIRMATION') {
      return res.status(400).json({
        success: false,
        error: `Cannot confirm payment. Current status: ${transaction.status}`,
      });
    }

    // Gateway confirmation
    transaction.status = 'RECOVERED';
    transaction.recoveryVerifiedAt = new Date();

    transaction.logs.push({
      action: 'PAYMENT_GATEWAY_CONFIRMED',
      details: `Gateway confirmed successful payment. Payment ID: ${paymentId}`,
    });

    transaction.decisionTrace.push({
      step: 'PAYMENT_VERIFICATION',
      status: 'VERIFIED',
      details: `Payment gateway confirmation received. Payment ID: ${paymentId}. Revenue recovery verified.`,
    });

    await transaction.save();

    res.status(200).json({
      success: true,
      message: 'Payment verified successfully via gateway webhook',
      transaction,
    });

  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});


// Verify actual payment recovery manually (admin fallback)
app.post('/api/verify/:transactionId', async (req, res) => {
  try {
    const transaction = await Transaction.findOne({
      transactionId: req.params.transactionId,
    });

    if (!transaction) {
      return res.status(404).json({
        success: false,
        error: 'Transaction not found',
      });
    }

    if (transaction.status !== 'AWAITING_CONFIRMATION') {
      return res.status(400).json({
        success: false,
        error: `Cannot verify recovery. Current status: ${transaction.status}`,
      });
    }

    transaction.status = 'RECOVERED';
    transaction.recoveryVerifiedAt = new Date();

    transaction.logs.push({
      action: 'RECOVERY_VERIFIED',
      details: `Payment confirmed manually. ₹${transaction.amount} successfully recovered.`,
    });

    transaction.decisionTrace.push({
      step: 'PAYMENT_VERIFICATION',
      status: 'VERIFIED',
      details: 'Payment manually verified through secure recovery verification.',
    });

    await transaction.save();

    res.json({
      success: true,
      message: 'Payment recovery verified successfully',
      transaction,
    });

  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});


// Trip circuit breaker
app.post('/api/circuit-breaker/:bank', (req, res) => {
  const message = tripCircuitBreaker(req.params.bank);

  res.json({
    success: true,
    message,
  });
});


// Full audit log
app.get('/api/audit-log', async (req, res) => {
  try {
    const transactions = await Transaction.find();

    const allLogs = transactions.flatMap(t =>
      t.logs.map(log => ({
        transactionId: t.transactionId,
        action: log.action,
        details: log.details,
        timestamp: log.timestamp,
      }))
    );

    allLogs.sort(
      (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
    );

    res.json(allLogs);

  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});
// Analytics Dashboard Data
app.get('/api/analytics', async (req, res) => {
  try {
    const transactions = await Transaction.find();

    const totalTransactions = transactions.length;

    const recoveredTransactions = transactions.filter(
      t => t.status === 'RECOVERED'
    );

    const totalRecovered = recoveredTransactions.length;

    const totalRevenueRecovered = recoveredTransactions.reduce(
      (sum, t) => sum + t.amount,
      0
    );

    const recoveryRate =
      totalTransactions > 0
        ? Number(((totalRecovered / totalTransactions) * 100).toFixed(1))
        : 0;

    // Bank-wise analytics
    const bankAnalytics = {};

    transactions.forEach(t => {
      if (!bankAnalytics[t.bankName]) {
        bankAnalytics[t.bankName] = {
          bank: t.bankName,
          total: 0,
          recovered: 0,
          revenueRecovered: 0
        };
      }

      bankAnalytics[t.bankName].total++;

      if (t.status === 'RECOVERED') {
        bankAnalytics[t.bankName].recovered++;
        bankAnalytics[t.bankName].revenueRecovered += t.amount;
      }
    });

    const banks = Object.values(bankAnalytics).map(bank => ({
      ...bank,
      recoveryRate:
        bank.total > 0
          ? Number(((bank.recovered / bank.total) * 100).toFixed(1))
          : 0
    }));

    // Error distribution
    const errorDistribution = {};

    transactions.forEach(t => {
      errorDistribution[t.errorCode] =
        (errorDistribution[t.errorCode] || 0) + 1;
    });

    const errors = Object.entries(errorDistribution).map(
      ([error, count]) => ({
        error,
        count
      })
    );

    res.json({
      overview: {
        totalTransactions,
        totalRecovered,
        totalRevenueRecovered,
        recoveryRate
      },
      banks,
      errors
    });

  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});


const PORT = process.env.PORT || 5000;

app.listen(PORT, () =>
  console.log(` SmartRetry AI Backend running on port ${PORT}`)
);

