require('dotenv').config();
const mongoose = require('mongoose');
const Transaction = require('./src/models/Transaction');

const banks = ['HDFC', 'SBI', 'ICICI'];
const errors = ['ERR_BANK_TIMEOUT', 'INSUFFICIENT_FUNDS', 'EXPIRED_VPA_REQUEST', 'LIMIT_EXCEEDED'];

async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  await Transaction.deleteMany({});

  const mockTxns = [];
  for (let i = 1; i <= 18; i++) {
    const bank = banks[Math.floor(Math.random() * banks.length)];
    const errorCode = errors[Math.floor(Math.random() * errors.length)];
    const amount = Math.floor(Math.random() * 15000) + 300;

    mockTxns.push({
      transactionId: `TXN${1000 + i}`,
      amount,
      bankName: bank,
      errorCode,
      logs: [{ action: 'CREATED', details: `Failed with ${errorCode} via ${bank}` }]
    });
  }

  await Transaction.insertMany(mockTxns);
  console.log(`✅ Seeded ${mockTxns.length} mock transactions`);
  mongoose.disconnect();
}

seed();