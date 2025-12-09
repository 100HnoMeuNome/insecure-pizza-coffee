const express = require('express');
const router = express.Router();
const db = require('../config/database');
const tracer = require('dd-trace');
const logger = require('../config/logger');
const { validateCard, validateCoupon } = require('../utils/cardValidator');

// Middleware to check if user is logged in
function requireAuth(req, res, next) {
  if (!req.session.userId) {
    return res.redirect('/auth/login');
  }
  next();
}

// Validate coupon endpoint
router.post('/coupon/validate', requireAuth, async (req, res) => {
  const span = tracer.scope().active();
  const { couponCode } = req.body;

  try {
    // Set user information for ASM tracking
    if (req.session && req.session.userId && req.session.user) {
      tracer.setUser({
        id: req.session.userId.toString(),
        email: req.session.user.email || undefined,
        name: req.session.user.username || undefined,
        isAdmin: req.session.user.isAdmin || false
      });
    }

    if (span) {
      span.setTag('endpoint.type', 'coupon_validation');
      span.setTag('usr.id', req.session.userId);
      span.setTag('usr.name', req.session.user.username);
    }

    logger.info('Coupon validation attempt', {
      user_id: req.session.userId,
      username: req.session.user.username,
      coupon_code: couponCode,
      ip: req.ip
    });

    const result = validateCoupon(couponCode, req.session.userId);

    if (result.valid) {
      logger.info('Coupon validated successfully', {
        user_id: req.session.userId,
        coupon_code: result.code,
        discount: result.discount,
        type: result.type
      });

      res.json({
        success: true,
        ...result
      });
    } else {
      logger.warn('Coupon validation failed', {
        user_id: req.session.userId,
        coupon_code: couponCode,
        error: result.error
      });

      res.json({
        success: false,
        ...result
      });
    }
  } catch (error) {
    logger.error('Coupon validation error', {
      error: error.message,
      stack: error.stack,
      user_id: req.session.userId
    });

    res.status(500).json({
      success: false,
      error: 'Failed to validate coupon'
    });
  }
});

// Process payment - VULNERABLE with Enhanced Validation
router.post('/process', requireAuth, async (req, res) => {
  const span = tracer.scope().active();
  const {
    orderId,
    paymentMethod,
    cardNumber,
    cardHolder,
    expiryDate,
    cvv,
    pixKey,
    couponCode
  } = req.body;

  try {
    // Verify order exists
    const orderQuery = `SELECT * FROM orders WHERE id = ${orderId}`;
    const [orders] = await db.query(orderQuery);

    if (orders.length === 0) {
      if (span) {
        span.setTag('payment.validation.result', 'order_not_found');
        // Custom Business Logic: Payment failure
        span.setTag('appsec.security_activity', 'business_logic.payment.failure');
        span.setTag('appsec.events.payment.attempt.status', 'failed');
        span.setTag('payment.failure.type', 'order_not_found');
      }
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = orders[0];
    let finalAmount = parseFloat(order.total_amount);

    // Set user information for ASM tracking
    if (req.session && req.session.userId && req.session.user) {
      tracer.setUser({
        id: req.session.userId.toString(),
        email: req.session.user.email || undefined,
        name: req.session.user.username || undefined,
        isAdmin: req.session.user.isAdmin || false
      });
    }

    // Custom Business Logic: Track payment processing
    if (span) {
      span.setTag('appsec.security_activity', 'business_logic.payment.processing');
      span.setTag('usr.id', req.session.userId);
      span.setTag('usr.name', req.session.user.username);
      span.setTag('payment.method', paymentMethod);
      span.setTag('payment.order_id', orderId);
      span.setTag('payment.amount', finalAmount);
      span.setTag('http.client_ip', req.ip);
    }

    // VULNERABILITY: Logging full credit card details in plaintext
    logger.info('Payment processing started', {
      user_id: req.session.userId,
      username: req.session.user.username,
      order_id: orderId,
      payment_method: paymentMethod,
      amount: finalAmount,
      card_number: cardNumber, // VULNERABILITY: Full card number in logs
      card_holder: cardHolder,
      cvv: cvv, // VULNERABILITY: CVV in logs
      expiry_date: expiryDate,
      ip: req.ip
    });

    // Validate coupon if provided
    let discountAmount = 0;
    let appliedCoupon = null;
    if (couponCode) {
      const couponResult = validateCoupon(couponCode, req.session.userId);
      if (couponResult.valid) {
        if (couponResult.type === 'percentage') {
          discountAmount = (finalAmount * couponResult.discount) / 100;
        } else {
          discountAmount = couponResult.discount;
        }
        finalAmount -= discountAmount;
        appliedCoupon = couponResult.code;

        if (span) {
          span.setTag('payment.coupon.applied', true);
          span.setTag('payment.coupon.code', appliedCoupon);
          span.setTag('payment.discount_amount', discountAmount);
        }
      }
    }

    // Validate credit card if payment method is credit card
    if (paymentMethod === 'credit_card') {
      // Custom Business Logic: payment.attempt event
      if (span) {
        span.setTag('appsec.security_activity', 'business_logic.payment.attempt');
        span.setTag('payment.card_validation.started', true);
      }

      const cardValidation = validateCard(cardNumber, cvv, expiryDate, cardHolder);

      if (!cardValidation.valid) {
        // Custom Business Logic: payment.failure event
        if (span) {
          span.setTag('appsec.security_activity', 'business_logic.payment.failure');
          span.setTag('appsec.events.payment.attempt.status', 'failed');
          span.setTag('payment.failure.type', 'card_validation_failed');
          span.setTag('payment.failure.reason', cardValidation.code);
          span.setTag('payment.validation.result', 'invalid_card');
        }

        // VULNERABILITY: Logging card details in failure logs
        logger.warn('Payment failed - invalid card', {
          user_id: req.session.userId,
          order_id: orderId,
          card_number: cardNumber, // VULNERABILITY: Full card number in logs
          error: cardValidation.error,
          code: cardValidation.code,
          ip: req.ip
        });

        return res.status(400).json({
          success: false,
          error: cardValidation.error,
          code: cardValidation.code
        });
      }

      // Check test card response
      if (cardValidation.isTestCard && cardValidation.response === 'DECLINED') {
        // Custom Business Logic: payment.failure event for declined cards
        if (span) {
          span.setTag('appsec.security_activity', 'business_logic.payment.failure');
          span.setTag('appsec.events.payment.attempt.status', 'failed');
          span.setTag('payment.failure.type', 'card_declined');
          span.setTag('payment.failure.reason', cardValidation.reason);
          span.setTag('payment.test_card', true);
          span.setTag('payment.card_brand', cardValidation.brand);
          span.setTag('payment.card_last4', cardValidation.lastFour);
          span.setTag('payment.validation.result', 'declined');
        }

        // VULNERABILITY: Logging full card details on declined payments
        logger.warn('Payment declined', {
          user_id: req.session.userId,
          order_id: orderId,
          card_number: cardNumber, // VULNERABILITY: Full card number in logs
          card_holder: cardHolder,
          cvv: cvv, // VULNERABILITY: CVV in logs
          reason: cardValidation.reason,
          card_brand: cardValidation.brand,
          card_last4: cardValidation.lastFour,
          ip: req.ip
        });

        return res.status(402).json({
          success: false,
          error: 'Payment declined',
          reason: cardValidation.reason,
          declined: true
        });
      }

      // VULNERABILITY: Storing sensitive payment data in plain text
      // VULNERABILITY: No PCI compliance
      if (span) {
        span.setTag('vulnerability.type', 'sensitive_data_exposure');
        span.setTag('vulnerability.category', 'cryptographic_failure');
        span.setTag('sensitive.data_type', 'payment_card');
        span.setTag('pci.compliance', 'none');
        span.setTag('payment.card_number', cardNumber); // VULNERABILITY
        span.setTag('payment.cvv', cvv); // VULNERABILITY
        span.setTag('payment.card_brand', cardValidation.brand);
        span.setTag('payment.card_type', cardValidation.type);
        span.setTag('payment.test_card', cardValidation.isTestCard);
        span.setTag('storage.encryption', 'none');
        span.setTag('storage.plaintext_sensitive_data', true);
      }
    }

    let transactionId = `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // VULNERABILITY: SQL Injection and storing sensitive data
    const paymentQuery = `INSERT INTO payment_transactions
                          (order_id, payment_method, card_number, card_holder, cvv, pix_key, amount, status, transaction_id)
                          VALUES (${orderId}, '${paymentMethod}', '${cardNumber}', '${cardHolder}', '${cvv}', '${pixKey}', ${finalAmount}, 'completed', '${transactionId}')`;

    if (span) {
      span.setTag('vulnerability.type', 'sql_injection');
      span.setTag('vulnerability.category', 'injection');
      span.setTag('sql.query', paymentQuery);
    }

    await db.query(paymentQuery);

    // Update order payment status
    const updateQuery = `UPDATE orders SET payment_status = 'paid', status = 'confirmed', total_amount = ${finalAmount} WHERE id = ${orderId}`;
    await db.query(updateQuery);

    // Custom Business Logic: Successful payment
    if (span) {
      span.setTag('appsec.security_activity', 'business_logic.payment.attempt');
      span.setTag('appsec.events.payment.attempt.status', 'success');
      span.setTag('payment.validation.result', 'success');
      span.setTag('payment.final_amount', finalAmount);
      span.setTag('payment.transaction_id', transactionId);
    }

    // VULNERABILITY: Logging full payment details including card info
    logger.info('Payment processed successfully', {
      user_id: req.session.userId,
      order_id: orderId,
      transaction_id: transactionId,
      amount: finalAmount,
      discount: discountAmount,
      coupon: appliedCoupon,
      card_number: cardNumber, // VULNERABILITY: Full card number in logs
      card_holder: cardHolder,
      cvv: cvv, // VULNERABILITY: CVV in logs
      expiry_date: expiryDate,
      ip: req.ip
    });

    // VULNERABILITY: Sending payment details in response
    res.json({
      success: true,
      transactionId,
      orderId,
      amount: finalAmount,
      discount: discountAmount,
      coupon: appliedCoupon,
      cardNumber: cardNumber, // Sending card number back to client
      message: 'Payment processed successfully'
    });
  } catch (error) {
    // Custom Business Logic: payment.failure event for errors
    if (span) {
      span.setTag('appsec.security_activity', 'business_logic.payment.failure');
      span.setTag('appsec.events.payment.attempt.status', 'failed');
      span.setTag('payment.failure.type', 'processing_error');
      span.setTag('payment.failure.reason', error.message);
      span.setTag('error', true);
      span.setTag('error.message', error.message);
    }

    logger.error('Payment processing error', {
      error: error.message,
      stack: error.stack,
      user_id: req.session.userId,
      order_id: orderId
    });

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
