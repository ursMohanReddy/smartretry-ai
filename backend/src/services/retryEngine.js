// backend/src/services/retryEngine.js
const Transaction = require('../models/Transaction');
const { evaluateTransaction } = require('./errorClassifier');

// The Global Circuit Breaker Registry
// If a bank fails repeatedly, we flip this to 'true' to protect their servers.
const bankOutageRegistry = {
  'HDFC': { isKilled: false },
  'SBI': { isKilled: false },
  'ICICI': { isKilled: false }
};

/**
 * SmartRetry AI - Step 2: Bounded Retry & Circuit Breaker Execution
 */
async function processRecoveryAttempt(transactionId) {
  // 1. Fetch the transaction from the database
  const transaction = await Transaction.findOne({ transactionId });
  if (!transaction) throw new Error('Transaction not found');

  // 2. Check the Global Circuit Breaker First (Safety Check)
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

  // 3. Enforce the Strict 3-Retry Cap (Safety Check)
  if (transaction.retryCount >= 3) {
    transaction.status = 'PERMANENTLY_FAILED';
    transaction.logs.push({
      action: 'MAX_RETRIES_REACHED',
      details: 'Exceeded maximum 3-attempt safety limit. Moved to manual review.'
    });
    await transaction.save();
    return { status: 'FAILED', message: 'Max 3 retry limit reached.' };
  }

  // 4. Run the AI Error Classifier from Step 1
  const agentAnalysis = evaluateTransaction(transaction);
  
  // Update transaction with the agent's findings
  transaction.recoveryScore = agentAnalysis.confidence;
  transaction.retryCount += 1;
  
  // 5. Execute Decision Logic based on Confidence
  if (agentAnalysis.confidence >= 50) {
    transaction.status = 'RETRY_SCHEDULED';
    transaction.logs.push({
      action: 'RETRY_SCHEDULED',
      details: `Confidence ${agentAnalysis.confidence}%. Strategy: ${agentAnalysis.strategy}`
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
    actionTaken: transaction.status
  };
}

// Helper function to manually trip the circuit breaker for the demo
function tripCircuitBreaker(bankName) {
  if (bankOutageRegistry[bankName]) {
    bankOutageRegistry[bankName].isKilled = true;
    return `${bankName} circuit breaker tripped. All retries paused.`;
  }
  return 'Bank not found in registry.';
}

module.exports = { processRecoveryAttempt, tripCircuitBreaker };
