// backend/src/models/Transaction.js
const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  transactionId: { type: String, required: true, unique: true },
  amount: { type: Number, required: true },
  bankName: { type: String, required: true },
  errorCode: {
    type: String,
    enum: ['ERR_BANK_TIMEOUT', 'INSUFFICIENT_FUNDS', 'EXPIRED_VPA_REQUEST', 'LIMIT_EXCEEDED'],
    required: true
  },
  status: {
    type: String,
    enum: ['FAILED', 'RETRY_SCHEDULED', 'RECOVERED', 'PERMANENTLY_FAILED', 'CIRCUIT_BREAKER_BLOCKED'],
    default: 'FAILED'
  },
  retryCount: { type: Number, default: 0, max: 3 },
  recoveryScore: { type: Number, default: 0 },
  logs: [{
    action: String,
    timestamp: { type: Date, default: Date.now },
    details: String
  }]
});

module.exports = mongoose.model('Transaction', transactionSchema);
