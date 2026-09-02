// backend/src/services/retryEngine.js

const Transaction = require('../models/Transaction');
const { evaluateTransaction } = require('./errorClassifier');
const { createPaymentLink } = require('./paymentService');

const bankOutageRegistry = {
  HDFC: { isKilled: false },
  SBI: { isKilled: false },
  ICICI: { isKilled: false },
};

async function processRecoveryAttempt(transactionId) {
  const transaction = await Transaction.findOne({ transactionId });

  if (!transaction) {
    throw new Error('Transaction not found');
  }

  const bank = transaction.bankName;

  // SAFETY CHECK: Circuit breaker
  if (bankOutageRegistry[bank]?.isKilled) {
    transaction.status = 'CIRCUIT_BREAKER_BLOCKED';

    transaction.logs.push({
      action: 'RETRY_BLOCKED',
      details: `Automated recovery blocked. Circuit breaker active for ${bank}.`,
    });

    await transaction.save();

    return {
      status: 'BLOCKED',
      message: `Circuit breaker active for ${bank}`,
    };
  }

  // SAFETY CHECK: Maximum retries
  if (transaction.retryCount >= 3) {
    transaction.status = 'PERMANENTLY_FAILED';

    transaction.logs.push({
      action: 'MAX_RETRIES_REACHED',
      details: 'Maximum 3 recovery attempts reached. Requires manual review.',
    });

    await transaction.save();

    return {
      status: 'FAILED',
      message: 'Maximum retry limit reached.',
    };
  }

  // STEP 1: ANALYZE
  transaction.status = 'ANALYZED';

  const agentAnalysis = evaluateTransaction(transaction);

  transaction.recoveryScore = agentAnalysis.confidence;
  transaction.recoveryProbability = agentAnalysis.confidence;
  transaction.recommendedAction = agentAnalysis.strategy;

  // Expected Recovery Value = Amount × Probability
  transaction.expectedRecoveryValue =
    transaction.amount * (agentAnalysis.confidence / 100);

  transaction.logs.push({
    action: 'ANALYZED',
    details: `Root cause: ${agentAnalysis.diagnosis}. Recovery probability: ${agentAnalysis.confidence}%.`,
  });

  // STEP 2: RECOMMEND ACTION
  transaction.status = 'ACTION_RECOMMENDED';

  transaction.logs.push({
    action: 'ACTION_RECOMMENDED',
    details: `Agent recommends: ${agentAnalysis.strategy}`,
  });

  // STEP 3: EXECUTE RECOVERY
  transaction.status = 'RECOVERY_IN_PROGRESS';
  transaction.retryCount += 1;

  transaction.logs.push({
    action: 'RECOVERY_STARTED',
    details: `Recovery attempt ${transaction.retryCount}/3 initiated.`,
  });

  // Generate payment link when recovery is worth attempting
  let paymentLink = null;

  if (agentAnalysis.confidence >= 50) {
    paymentLink = await createPaymentLink(transaction);

    if (paymentLink) {
      transaction.paymentLink = paymentLink;

      transaction.logs.push({
        action: 'PAYMENT_LINK_CREATED',
        details: 'Fresh payment recovery link generated for customer.',
      });
    }
  }

  // Prepare customer message
  let customerMessage = agentAnalysis.customerMessage;

  if (paymentLink) {
    customerMessage = customerMessage.replace(
      '[PAYMENT_LINK]',
      paymentLink
    );
  }

  transaction.lastCustomerMessage = customerMessage;

  // IMPORTANT:
  // Action attempted DOES NOT mean money recovered.
  // Wait for actual payment confirmation.
  if (agentAnalysis.confidence >= 50) {
    transaction.status = 'AWAITING_CONFIRMATION';

    transaction.logs.push({
      action: 'AWAITING_CONFIRMATION',
      details:
        'Recovery action completed. Waiting for verified payment confirmation.',
    });
  } else {
    transaction.status = 'PERMANENTLY_FAILED';

    transaction.logs.push({
      action: 'LOW_RECOVERY_PROBABILITY',
      details: `Recovery probability ${agentAnalysis.confidence}% is below safe threshold.`,
    });
  }

  await transaction.save();

  return {
    status: transaction.status,
    diagnosis: agentAnalysis.diagnosis,
    confidence: agentAnalysis.confidence,
    recoveryProbability: transaction.recoveryProbability,
    expectedRecoveryValue: transaction.expectedRecoveryValue,
    recommendedAction: transaction.recommendedAction,
    attemptNumber: transaction.retryCount,
    paymentLink: transaction.paymentLink,
    customerMessage: transaction.lastCustomerMessage,
  };
}

function tripCircuitBreaker(bankName) {
  if (bankOutageRegistry[bankName]) {
    bankOutageRegistry[bankName].isKilled = true;

    return `${bankName} circuit breaker tripped. All automated recovery attempts paused.`;
  }

  return 'Bank not found in registry.';
}

module.exports = {
  processRecoveryAttempt,
  tripCircuitBreaker,
};