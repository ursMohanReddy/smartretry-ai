const bankOutageRegistry = {
  HDFC: { isKilled: false },
  SBI: { isKilled: false },
  ICICI: { isKilled: false },
};

function isCircuitBreakerActive(bankName) {
  return bankOutageRegistry[bankName]?.isKilled || false;
}

function tripCircuitBreaker(bankName) {
  if (!bankOutageRegistry[bankName]) {
    return null;
  }

  bankOutageRegistry[bankName].isKilled = true;

  return bankOutageRegistry[bankName];
}

function resetCircuitBreaker(bankName) {
  if (!bankOutageRegistry[bankName]) {
    return null;
  }

  bankOutageRegistry[bankName].isKilled = false;

  return bankOutageRegistry[bankName];
}

function getCircuitBreakers() {
  return Object.entries(bankOutageRegistry).map(([bank, data]) => ({
    bank,
    status: data.isKilled ? 'OPEN' : 'CLOSED',
    isBlocked: data.isKilled,
  }));
}

module.exports = {
  isCircuitBreakerActive,
  tripCircuitBreaker,
  resetCircuitBreaker,
  getCircuitBreakers,
};