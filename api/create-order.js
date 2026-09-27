const Razorpay = require('razorpay');

const PLAN_PRICES = {
  'The Starter': { regular: 500, friend: 0 },
  'Physical Chemistry (Pro)': { regular: 1500, friend: 1000 },
  'The Intimacy Suite (Ultra Pro)': { regular: 3000, friend: 2000 }
};

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { amount, currency, receipt, plan, promoCode, customer } = req.body || {};
  const isFriend = (promoCode || '').toString().trim().toUpperCase() === 'MKCUK';
  
  let targetPriceRupees;
  if (plan && PLAN_PRICES[plan]) {
    targetPriceRupees = isFriend ? PLAN_PRICES[plan].friend : PLAN_PRICES[plan].regular;
  } else {
    targetPriceRupees = Number(amount) / 100;
  }

  // Handle Free Enrollment (Starter + MKCUK = 0)
  if (targetPriceRupees === 0 && isFriend) {
    console.log('Free enrollment registered successfully:', { plan, customer, promoCode });
    res.status(200).json({
      free: true,
      message: 'Free enrollment verified successfully.'
    });
    return;
  }

  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    res.status(401).json({ error: 'Razorpay credentials are not configured on the server. Please set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in Vercel environment variables.' });
    return;
  }

  const expectedPaise = Math.round(targetPriceRupees * 100);
  if (!expectedPaise || !Number.isFinite(expectedPaise) || expectedPaise < 100) {
    res.status(400).json({ error: 'Amount must be at least 100 paise (₹1).' });
    return;
  }

  const instance = new Razorpay({ key_id: keyId, key_secret: keySecret });

  try {
    const order = await instance.orders.create({
      amount: expectedPaise,
      currency: currency || 'INR',
      receipt: receipt || `ncs_${Date.now()}`,
      notes: {
        customer_name: customer?.name || '',
        customer_phone: customer?.phone || '',
        customer_email: customer?.email || '',
        promo_code: isFriend ? 'MKCUK' : 'NONE',
        plan: plan || ''
      }
    });

    res.status(200).json({
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
      isFriend: isFriend
    });
  } catch (err) {
    console.error('Razorpay order creation failed:', err);
    res.status(500).json({ error: 'Could not create the order. Please try again shortly.' });
  }
};
