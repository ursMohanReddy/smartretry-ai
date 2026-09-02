// backend/src/services/retryEngine.js
const Transaction = require('../models/Transaction');
const { evaluateTransaction } = require('./errorClassifier');
const { createPaymentLink } = require('./paymentService');

const bankOutageRegistry = {
  'HDFC': { isKilled: false },
  'SBI': { isKilled: false },
  'ICICI': { isKilled: false }
};

async function processRecoveryAttempt(transactionId) {
  const transaction = await Transaction.findOne({ transactionId });
  if (!transaction) throw new Error('Transaction not found');

  const bank = transaction.bankName;
  if (bankOutageRegistry[bank] && bankOutageRegistry[bank].isKilled) {
    transaction.status = 'CIRCUIT_BREAKER_BLOCKED';
    transaction.logs.push({
      action: 'RETRY_BLOCKED',
      details: `Automated retries paused. Circuit breaker active for ${bank}.`
    });
    await transaction.save();
    return { status: 'BLOCKED', message: `Circuit breaker active for ${bank}` };
  }

  if (transaction.retryCount >= 3) {
    transaction.status = 'PERMANENTLY_FAILED';
    transaction.logs.push({
      action: 'MAX_RETRIES_REACHED',
      details: 'Exceeded maximum 3-attempt safety limit. Moved to manual review.'
    });
    await transaction.save();
    return { status: 'FAILED', message: 'Max 3 retry limit reached.' };
  }

  const agentAnalysis = evaluateTransaction(transaction);
  transaction.recoveryScore = agentAnalysis.confidence;
  transaction.retryCount += 1;

  // Generate a real Razorpay payment link and insert it into the message
  const realPaymentLink = await createPaymentLink(transaction);
  if (realPaymentLink) {
    agentAnalysis.customerMessage = agentAnalysis.customerMessage.replace('[PAYMENT_LINK]', realPaymentLink);
  }

  if (agentAnalysis.confidence >= 50) {
    // Simulate the retry executing now and succeeding
    transaction.status = 'RECOVERED';
    transaction.logs.push({
      action: 'RECOVERED',
      details: `Retry succeeded. Confidence ${agentAnalysis.confidence}%. Strategy: ${agentAnalysis.strategy}`
    });
  } else {
    transaction.status = 'PERMANENTLY_FAILED';
    transaction.logs.push({
      action: 'ABORTED',
      details: `Confidence too low (${agentAnalysis.confidence}%). Strategy: ${agentAnalysis.strategy}`
    });
  }

  await transaction.save();

  return {
    status: 'SUCCESS',
    diagnosis: agentAnalysis.diagnosis,
    confidence: agentAnalysis.confidence,
    attemptNumber: transaction.retryCount,
    actionTaken: transaction.status,
    customerMessage: agentAnalysis.customerMessage
  };
}

function tripCircuitBreaker(bankName) {
  if (bankOutageRegistry[bankName]) {
    bankOutageRegistry[bankName].isKilled = true;
    return `${bankName} circuit breaker tripped. All retries paused.`;
  }
  return 'Bank not found in registry.';
}

module.exports = { processRecoveryAttempt, tripCircuitBreaker };