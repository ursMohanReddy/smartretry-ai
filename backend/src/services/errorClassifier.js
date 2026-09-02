// backend/src/services/errorClassifier.js

/**
 * SmartRetry AI - Error Classifier & Explainable Confidence Calculator
 * Deterministic, explainable engine analyzing failed payments.
 */

// 1. Error Classifier Mapping
const { isCircuitBreakerActive } = require('./circuitBreakerService');
function classifyError(errorCode) {
  switch (errorCode) {
    case 'ERR_BANK_TIMEOUT':
      return {
        diagnosis: 'Temporary bank/gateway issue',
        strategy: 'Delayed retry',
        errorTypeScore: 35
      };
    case 'EXPIRED_VPA_REQUEST':
      return {
        diagnosis: 'UPI collect request expired',
        strategy: 'Generate fresh payment request',
        errorTypeScore: 30
      };
    case 'INSUFFICIENT_FUNDS':
      return {
        diagnosis: 'Insufficient account balance',
        strategy: 'Payment reminder',
        errorTypeScore: 20
      };
    case 'LIMIT_EXCEEDED':
      return {
        diagnosis: 'Payment limit reached',
        strategy: 'Suggest alternative payment method',
        errorTypeScore: 15
      };
    default:
      return {
        diagnosis: 'Unknown or permanent failure',
        strategy: 'Manual review',
        errorTypeScore: 5
      };
  }
}

// 2. Factor Scoring Functions
function getAmountScore(amount) {
  if (amount <= 2500) return { factor: 'Amount', score: 10 };
  if (amount <= 10000) return { factor: 'Amount', score: 8 };
  return { factor: 'Amount', score: 5 };
}

function getBankHealthScore(bankName) {
  const isBlocked = isCircuitBreakerActive(bankName);

  if (isBlocked) {
    return {
      factor: 'Bank health',
      score: 0
    };
  }

  return {
    factor: 'Bank health',
    score: 10
  };
}

function getTimePatternScore() {
  const hour = new Date().getHours();
  if (hour >= 9 && hour <= 21) {
    return { factor: 'Time pattern', score: 12 };
  }
  return { factor: 'Time pattern', score: 7 };
}

function getHistoricalScore(errorCode) {
  if (errorCode === 'ERR_BANK_TIMEOUT' || errorCode === 'EXPIRED_VPA_REQUEST') {
    return { factor: 'Historical data', score: 20 };
  }
  return { factor: 'Historical data', score: 10 };
}

// 3. Reason-first customer message generator
// Every message states WHY it failed before asking for any action.
function generateCustomerMessage(transaction, classification) {
  const { amount } = transaction;
  const amountStr = `₹${amount.toLocaleString('en-IN')}`;

  switch (transaction.errorCode) {
    case 'ERR_BANK_TIMEOUT':
      return `Heads up: your ${amountStr} payment had a brief delay due to a bank server issue. We're automatically retrying it shortly — no action needed from you.`;

    case 'EXPIRED_VPA_REQUEST':
      return `Your ${amountStr} payment request expired before you could approve it. Reason: the UPI collect request timed out. Tap here to get a fresh payment link and complete it: [PAYMENT_LINK]`;

    case 'INSUFFICIENT_FUNDS':
      return `Your ${amountStr} payment didn't go through. Reason: insufficient balance in your account at the time of the attempt. Tap here to pay now whenever you're ready: [PAYMENT_LINK]`;

    case 'LIMIT_EXCEEDED':
      return `Your ${amountStr} payment couldn't be completed. Reason: you've reached your daily payment limit on this method. Tap here to pay using a different method instead: [PAYMENT_LINK]`;

    default:
      return `Your ${amountStr} payment could not be completed. Reason: ${classification.diagnosis}. Please contact support or try again: [PAYMENT_LINK]`;
  }
}

// 4. Main Evaluation Engine
function evaluateTransaction(transaction) {
  const { transactionId, amount, bankName, errorCode } = transaction;

  const classification = classifyError(errorCode);

  const factors = [
    { factor: 'Error type', score: classification.errorTypeScore },
    getAmountScore(amount),
    getBankHealthScore(bankName),
    getTimePatternScore(),
    getHistoricalScore(errorCode)
  ];

  const rawScore = factors.reduce((sum, item) => sum + item.score, 0);
  const finalConfidence = Math.max(0, Math.min(100, rawScore));

  const customerMessage = generateCustomerMessage(transaction, classification);

  return {
    transactionId,
    diagnosis: classification.diagnosis,
    strategy: classification.strategy,
    confidence: finalConfidence,
    factors,
    customerMessage
  };
}

module.exports = { evaluateTransaction };