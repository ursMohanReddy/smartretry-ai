// backend/src/services/paymentService.js
require('dotenv').config();
const Razorpay = require('razorpay');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

async function createPaymentLink(transaction) {
  try {
    const paymentLink = await razorpay.paymentLink.create({
      amount: transaction.amount * 100, // Razorpay expects paise, not rupees
      currency: 'INR',
      description: `Retry payment for order - ${transaction.transactionId}`,
            reference_id: `${transaction.transactionId}-${Date.now()}`,
      notify: {
        sms: false,
        email: false
      }
    });

    return paymentLink.short_url;
  } catch (err) {
    console.error('Razorpay payment link FULL error:', JSON.stringify(err, null, 2));
    return null;
  }
}

module.exports = { createPaymentLink };