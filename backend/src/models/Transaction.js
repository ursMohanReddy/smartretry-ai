// backend/src/models/Transaction.js

const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema(
  {
    transactionId: {
      type: String,
      required: true,
      unique: true,
    },

    amount: {
      type: Number,
      required: true,
    },

    bankName: {
      type: String,
      required: true,
    },

    errorCode: {
      type: String,
      enum: [
        'ERR_BANK_TIMEOUT',
        'INSUFFICIENT_FUNDS',
        'EXPIRED_VPA_REQUEST',
        'LIMIT_EXCEEDED',
      ],
      required: true,
    },

    status: {
      type: String,
      enum: [
        'FAILED',
        'ANALYZED',
        'ACTION_RECOMMENDED',
        'RECOVERY_IN_PROGRESS',
        'AWAITING_CONFIRMATION',
        'RECOVERED',
        'PERMANENTLY_FAILED',
        'CIRCUIT_BREAKER_BLOCKED',
      ],
      default: 'FAILED',
    },

    retryCount: {
      type: Number,
      default: 0,
      max: 3,
    },

    recoveryScore: {
      type: Number,
      default: 0,
    },

    recommendedAction: {
      type: String,
      default: '',
    },

    recoveryProbability: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },

    expectedRecoveryValue: {
      type: Number,
      default: 0,
    },

    paymentLink: {
      type: String,
      default: '',
    },

    recoveryVerifiedAt: {
      type: Date,
      default: null,
    },

    lastCustomerMessage: {
      type: String,
      default: '',
    },
    decisionTrace: [
  {
    step: String,
    status: String,
    details: String,
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
],

    logs: [
      {
        action: String,
        timestamp: {
          type: Date,
          default: Date.now,
        },
        details: String,
      },
    ],
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Transaction', transactionSchema);