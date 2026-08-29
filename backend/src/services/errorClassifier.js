// backend/src/services/errorClassifier.js

/**
 * SmartRetry AI - Step 1: Error Classifier & Explainable Confidence Calculator
 * Deterministic, explainable engine analyzing failed payments.
 */

// 1. Error Classifier Mapping
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
  // Mock bank health check
  const unhealthyBanks = []; 
  if (unhealthyBanks.includes(bankName)) return { factor: 'Bank health', score: 0 };
  return { factor: 'Bank health', score: 10 };
}

function getTimePatternScore() {
  // Favorable recovery window during standard hours (9 AM - 9 PM)
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

// 3. Main Evaluation Engine
function evaluateTransaction(transaction) {
  const { transactionId, amount, bankName, errorCode } = transaction;

  // Step A: Classify error and get base score
  const classification = classifyError(errorCode);

  // Step B: Collect contributing factors
  const factors = [
    { factor: 'Error type', score: classification.errorTypeScore },
    getAmountScore(amount),
    getBankHealthScore(bankName),
    getTimePatternScore(),
    getHistoricalScore(errorCode)
  ];

  // Step C: Calculate total score and clamp between 0 and 100
  const rawScore = factors.reduce((sum, item) => sum + item.score, 0);
  const finalConfidence = Math.max(0, Math.min(100, rawScore));

  return {
    transactionId,
    diagnosis: classification.diagnosis,
    strategy: classification.strategy,
    confidence: finalConfidence,
    factors
  };
}

module.exports = { evaluateTransaction };