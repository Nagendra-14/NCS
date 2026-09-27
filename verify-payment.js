const crypto = require('crypto');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keySecret) {
    res.status(401).json({ error: 'Razorpay credentials are not configured on the server.' });
    return;
  }

  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, plan, customer } = req.body || {};

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    res.status(400).json({ error: 'Missing razorpay_order_id, razorpay_payment_id, or razorpay_signature.' });
    return;
  }

  const generatedSignature = crypto
    .createHmac('sha256', keySecret)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest('hex');

  const isValid = generatedSignature === razorpay_signature;

  if (!isValid) {
    res.status(400).json({ success: false, error: 'Signature verification failed.' });
    return;
  }

  console.log('Payment verified successfully:', { customer, plan, razorpay_payment_id });

  res.status(200).json({ success: true });
};
