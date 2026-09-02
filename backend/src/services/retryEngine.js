const Transaction = require('../models/Transaction');
const { evaluateTransaction } = require('./errorClassifier');
const { createPaymentLink } = require('./paymentService');

const {
  isCircuitBreakerActive,
  tripCircuitBreaker,
  resetCircuitBreaker,
  getCircuitBreakers,
} = require('./circuitBreakerService');

async function processRecoveryAttempt(transactionId) {
  const transaction = await Transaction.findOne({ transactionId });

  if (!transaction) {
    throw new Error('Transaction not found');
  }

  const bank = transaction.bankName;

  // Clear previous decision trace for a fresh agent run
  transaction.decisionTrace = [];

  // STEP 1 — DETECT
  transaction.decisionTrace.push({
    step: 'DETECT',
    status: 'COMPLETED',
    details: `Detected failed payment of ₹${transaction.amount} from ${bank}. Error: ${transaction.errorCode}.`,
  });

  // SAFETY CHECK — Circuit breaker
  if (isCircuitBreakerActive(bank)) {
    transaction.status = 'CIRCUIT_BREAKER_BLOCKED';

    transaction.decisionTrace.push({
      step: 'SAFETY_CHECK',
      status: 'BLOCKED',
      details: `Circuit breaker is active for ${bank}. Automated recovery stopped.`,
    });

    transaction.logs.push({
      action: 'RETRY_BLOCKED',
      details: `Automated recovery blocked. Circuit breaker active for ${bank}.`,
    });

    await transaction.save();

    return {
      status: 'BLOCKED',
      message: `Circuit breaker active for ${bank}`,
      decisionTrace: transaction.decisionTrace,
    };
  }

  // SAFETY CHECK — Maximum retries
  if (transaction.retryCount >= 3) {
    transaction.status = 'PERMANENTLY_FAILED';

    transaction.decisionTrace.push({
      step: 'SAFETY_CHECK',
      status: 'BLOCKED',
      details: 'Maximum recovery attempt limit reached. Manual review required.',
    });

    transaction.logs.push({
      action: 'MAX_RETRIES_REACHED',
      details: 'Maximum 3 recovery attempts reached. Requires manual review.',
    });

    await transaction.save();

    return {
      status: 'FAILED',
      message: 'Maximum retry limit reached.',
      decisionTrace: transaction.decisionTrace,
    };
  }

  // STEP 2 — DIAGNOSE
  transaction.status = 'ANALYZED';

  const agentAnalysis = evaluateTransaction(transaction);

  transaction.recoveryScore = agentAnalysis.confidence;
  transaction.recoveryProbability = agentAnalysis.confidence;
  transaction.recommendedAction = agentAnalysis.strategy;

  transaction.expectedRecoveryValue =
    transaction.amount * (agentAnalysis.confidence / 100);

  transaction.decisionTrace.push({
    step: 'DIAGNOSE',
    status: 'COMPLETED',
    details: `Root cause identified: ${agentAnalysis.diagnosis}.`,
  });

  transaction.logs.push({
    action: 'ANALYZED',
    details: `Root cause: ${agentAnalysis.diagnosis}. Recovery probability: ${agentAnalysis.confidence}%.`,
  });

  // STEP 3 — ANALYZE
  const factorDetails = agentAnalysis.factors
    .map(item => `${item.factor}: ${item.score}`)
    .join(', ');

  transaction.decisionTrace.push({
    step: 'ANALYZE',
    status: 'COMPLETED',
    details: `Recovery probability: ${agentAnalysis.confidence}%. Factors considered — ${factorDetails}. Expected recovery value: ₹${transaction.expectedRecoveryValue.toFixed(2)}.`,
  });

  // STEP 4 — DECIDE
  transaction.status = 'ACTION_RECOMMENDED';

  transaction.decisionTrace.push({
    step: 'DECIDE',
    status: 'COMPLETED',
    details: `Recommended action: ${agentAnalysis.strategy}.`,
  });

  transaction.logs.push({
    action: 'ACTION_RECOMMENDED',
    details: `Agent recommends: ${agentAnalysis.strategy}`,
  });

  // STEP 5 — SAFETY CHECK
  transaction.decisionTrace.push({
    step: 'SAFETY_CHECK',
    status: 'PASSED',
    details: `Retry count ${transaction.retryCount}/3. Circuit breaker inactive for ${bank}.`,
  });

  // STEP 6 — EXECUTE
  transaction.status = 'RECOVERY_IN_PROGRESS';
  transaction.retryCount += 1;

  transaction.decisionTrace.push({
    step: 'EXECUTE',
    status: 'STARTED',
    details: `Recovery attempt ${transaction.retryCount}/3 initiated.`,
  });

  transaction.logs.push({
    action: 'RECOVERY_STARTED',
    details: `Recovery attempt ${transaction.retryCount}/3 initiated.`,
  });

  let paymentLink = null;

  if (agentAnalysis.confidence >= 50) {
    paymentLink = await createPaymentLink(transaction);

    if (paymentLink) {
      transaction.paymentLink = paymentLink;

      transaction.decisionTrace.push({
        step: 'EXECUTE',
        status: 'COMPLETED',
        details: 'Recovery payment link successfully generated.',
      });

      transaction.logs.push({
        action: 'PAYMENT_LINK_CREATED',
        details: 'Fresh payment recovery link generated for customer.',
      });
    }
  }

  let customerMessage = agentAnalysis.customerMessage;

  if (paymentLink) {
    customerMessage = customerMessage.replace(
      '[PAYMENT_LINK]',
      paymentLink
    );
  }

  transaction.lastCustomerMessage = customerMessage;

  // STEP 7 — WAIT FOR VERIFICATION
  if (agentAnalysis.confidence >= 50) {
    transaction.status = 'AWAITING_CONFIRMATION';

    transaction.decisionTrace.push({
      step: 'VERIFY',
      status: 'AWAITING',
      details: 'Recovery action completed. Waiting for verified payment confirmation before marking revenue as recovered.',
    });

    transaction.logs.push({
      action: 'AWAITING_CONFIRMATION',
      details:
        'Recovery action completed. Waiting for verified payment confirmation.',
    });
  } else {
    transaction.status = 'PERMANENTLY_FAILED';

    transaction.decisionTrace.push({
      step: 'DECIDE',
      status: 'REJECTED',
      details: `Recovery probability ${agentAnalysis.confidence}% is below the safe recovery threshold.`,
    });

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
    decisionTrace: transaction.decisionTrace,
  };
}

module.exports = {
  processRecoveryAttempt,
  tripCircuitBreaker,
  resetCircuitBreaker,
  getCircuitBreakers,
};