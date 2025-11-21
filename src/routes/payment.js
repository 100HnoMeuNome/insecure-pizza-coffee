const express = require('express');
const router = express.Router();
const db = require('../config/database');
const tracer = require('dd-trace');

// Middleware to check if user is logged in
function requireAuth(req, res, next) {
  if (!req.session.userId) {
    return res.redirect('/auth/login');
  }
  next();
}

// Process payment - VULNERABLE
router.post('/process', requireAuth, async (req, res) => {
  const span = tracer.scope().active();
  const {
    orderId,
    paymentMethod,
    cardNumber,
    cardHolder,
    expiryDate,
    cvv,
    pixKey
  } = req.body;

  try {
    // Verify order exists
    const orderQuery = `SELECT * FROM orders WHERE id = ${orderId}`;
    const [orders] = await db.query(orderQuery);

    if (orders.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = orders[0];

    // VULNERABILITY: Storing sensitive payment data in plain text
    // VULNERABILITY: No PCI compliance
    // VULNERABILITY: Logging sensitive data
    console.log('Processing payment:', {
      orderId,
      paymentMethod,
      cardNumber,
      cvv,
      pixKey
    });

    if (span) {
      // VULNERABILITY: Sending sensitive data to APM
      span.setTag('vulnerability.type', 'sensitive_data_exposure');
      span.setTag('vulnerability.category', 'cryptographic_failure');
      span.setTag('sensitive.data_type', 'payment_card');
      span.setTag('pci.compliance', 'none');
      span.setTag('payment.method', paymentMethod);
      span.setTag('payment.card_number', cardNumber); // VULNERABILITY
      span.setTag('payment.cvv', cvv); // VULNERABILITY
      span.setTag('payment.order_id', orderId);
      span.setTag('http.client_ip', req.ip);
    }

    let transactionId = `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // VULNERABILITY: SQL Injection and storing sensitive data
    const paymentQuery = `INSERT INTO payment_transactions
                          (order_id, payment_method, card_number, card_holder, cvv, pix_key, amount, status, transaction_id)
                          VALUES (${orderId}, '${paymentMethod}', '${cardNumber}', '${cardHolder}', '${cvv}', '${pixKey}', ${order.total_amount}, 'completed', '${transactionId}')`;

    if (span) {
      span.setTag('vulnerability.type', 'sql_injection');
      span.setTag('vulnerability.category', 'injection');
      span.setTag('sql.query', paymentQuery);
      span.setTag('storage.encryption', 'none');
      span.setTag('storage.plaintext_sensitive_data', true);
    }

    await db.query(paymentQuery);

    // Update order payment status
    const updateQuery = `UPDATE orders SET payment_status = 'paid', status = 'confirmed' WHERE id = ${orderId}`;
    await db.query(updateQuery);

    // VULNERABILITY: Sending payment details in response
    res.json({
      success: true,
      transactionId,
      orderId,
      amount: order.total_amount,
      cardNumber: cardNumber, // Sending card number back to client
      message: 'Payment processed successfully'
    });
  } catch (error) {
    console.error('Payment processing error:', error);
    res.status(500).json({
      error: 'Payment processing failed',
      details: error.message // VULNERABILITY: Information disclosure
    });
  }
});

// Generate PIX QR Code - VULNERABLE
router.post('/pix/generate', requireAuth, async (req, res) => {
  const { orderId } = req.body;

  try {
    // VULNERABILITY: No input validation
    const query = `SELECT * FROM orders WHERE id = ${orderId}`;
    const [orders] = await db.query(query);

    if (orders.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = orders[0];

    // Convert total_amount to number
    const totalAmount = parseFloat(order.total_amount);

    // Generate fake PIX code
    const pixCode = `00020126580014br.gov.bcb.pix0136${Date.now()}${Math.random().toString(36).substr(2, 9)}520400005303986540${totalAmount.toFixed(2)}5802BR5925Insecure Pizza and Coffee6009SAO PAULO62070503***6304`;

    // VULNERABILITY: Storing PIX code without encryption
    const pixQuery = `INSERT INTO payment_transactions
                      (order_id, payment_method, pix_key, amount, status, transaction_id)
                      VALUES (${orderId}, 'pix', '${pixCode}', ${order.total_amount}, 'pending', 'PIX-${Date.now()}')`;

    await db.query(pixQuery);

    res.json({
      success: true,
      pixCode,
      amount: order.total_amount,
      orderId
    });
  } catch (error) {
    console.error('PIX generation error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Check PIX payment status - VULNERABLE to IDOR
router.get('/pix/status/:orderId', requireAuth, async (req, res) => {
  const { orderId } = req.params;

  try {
    // VULNERABILITY: No authorization check
    const query = `SELECT * FROM payment_transactions WHERE order_id = ${orderId} AND payment_method = 'pix'`;
    const [payments] = await db.query(query);

    if (payments.length === 0) {
      return res.json({ status: 'not_found' });
    }

    const payment = payments[0];

    // Simulate random payment confirmation
    if (Math.random() > 0.5 && payment.status === 'pending') {
      const updateQuery = `UPDATE payment_transactions SET status = 'completed' WHERE id = ${payment.id}`;
      await db.query(updateQuery);

      const orderUpdateQuery = `UPDATE orders SET payment_status = 'paid', status = 'confirmed' WHERE id = ${orderId}`;
      await db.query(orderUpdateQuery);

      return res.json({ status: 'paid', transactionId: payment.transaction_id });
    }

    res.json({ status: payment.status, transactionId: payment.transaction_id });
  } catch (error) {
    console.error('PIX status check error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get payment history - VULNERABLE
router.get('/history', requireAuth, async (req, res) => {
  try {
    // VULNERABILITY: Exposing all payment details including sensitive data
    const query = `SELECT pt.*, o.user_id, u.username
                   FROM payment_transactions pt
                   JOIN orders o ON pt.order_id = o.id
                   JOIN users u ON o.user_id = u.id
                   WHERE o.user_id = ${req.session.userId}`;

    const [payments] = await db.query(query);

    // VULNERABILITY: Returning sensitive payment data
    res.json({ payments });
  } catch (error) {
    console.error('Payment history error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
