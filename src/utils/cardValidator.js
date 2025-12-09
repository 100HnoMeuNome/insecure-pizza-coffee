// Card Validation Utility
// Based on Mastercard Unified Checkout Solutions Test Data
// https://developer.mastercard.com/unified-checkout-solutions/documentation/testing/test_data/

// VULNERABILITY: This is intentionally insecure for demonstration purposes
// In production, NEVER handle card validation on the client side or server side
// Use PCI-compliant payment processors like Stripe, PayPal, etc.

const tracer = require('dd-trace');

// Mastercard Test Cards (from official documentation)
const MASTERCARD_TEST_CARDS = {
  // Approved transactions
  APPROVED: [
    { number: '5555555555554444', brand: 'Mastercard', type: 'Credit', response: 'APPROVED' },
    { number: '2223000048410010', brand: 'Mastercard', type: 'Credit', response: 'APPROVED' },
    { number: '5100060000000002', brand: 'Mastercard', type: 'Debit', response: 'APPROVED' },
    { number: '5100290029002909', brand: 'Mastercard', type: 'Prepaid', response: 'APPROVED' },
  ],

  // Declined transactions
  DECLINED: [
    { number: '5555555555555557', brand: 'Mastercard', type: 'Credit', response: 'DECLINED', reason: 'GENERIC_DECLINE' },
    { number: '5105105105105100', brand: 'Mastercard', type: 'Credit', response: 'DECLINED', reason: 'INSUFFICIENT_FUNDS' },
    { number: '5555555555556666', brand: 'Mastercard', type: 'Credit', response: 'DECLINED', reason: 'INVALID_CVV' },
  ],

  // Other scenarios
  ERRORS: [
    { number: '5555555555558888', brand: 'Mastercard', type: 'Credit', response: 'ERROR', reason: 'CARD_EXPIRED' },
    { number: '5555555555559999', brand: 'Mastercard', type: 'Credit', response: 'ERROR', reason: 'INVALID_CARD' },
  ]
};

// Additional test cards (Visa, Amex for variety)
const OTHER_TEST_CARDS = {
  VISA_APPROVED: { number: '4111111111111111', brand: 'Visa', type: 'Credit', response: 'APPROVED' },
  VISA_DECLINED: { number: '4000000000000002', brand: 'Visa', type: 'Credit', response: 'DECLINED', reason: 'GENERIC_DECLINE' },
  AMEX_APPROVED: { number: '378282246310005', brand: 'American Express', type: 'Credit', response: 'APPROVED' },
  AMEX_DECLINED: { number: '371449635398431', brand: 'American Express', type: 'Credit', response: 'DECLINED', reason: 'INSUFFICIENT_FUNDS' },
};

// Create a map for quick lookup
const ALL_TEST_CARDS = {};
[...Object.values(MASTERCARD_TEST_CARDS).flat(), ...Object.values(OTHER_TEST_CARDS)].forEach(card => {
  ALL_TEST_CARDS[card.number.replace(/\s/g, '')] = card;
});

/**
 * Validate card number using Luhn algorithm
 * VULNERABILITY: Should never validate cards on server side in production
 */
function luhnCheck(cardNumber) {
  const digits = cardNumber.replace(/\s/g, '').split('').map(Number);
  let sum = 0;
  let isEven = false;

  for (let i = digits.length - 1; i >= 0; i--) {
    let digit = digits[i];

    if (isEven) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }

    sum += digit;
    isEven = !isEven;
  }

  return sum % 10 === 0;
}

/**
 * Detect card brand from card number
 */
function detectCardBrand(cardNumber) {
  const cleaned = cardNumber.replace(/\s/g, '');

  // Mastercard: 51-55, 2221-2720
  if (/^5[1-5]/.test(cleaned) || /^2(22[1-9]|2[3-9][0-9]|[3-6][0-9]{2}|7[0-1][0-9]|720)/.test(cleaned)) {
    return 'Mastercard';
  }

  // Visa: 4
  if (/^4/.test(cleaned)) {
    return 'Visa';
  }

  // American Express: 34, 37
  if (/^3[47]/.test(cleaned)) {
    return 'American Express';
  }

  return 'Unknown';
}

/**
 * Validate card number
 * Returns validation result with Datadog ASM tracking
 */
function validateCard(cardNumber, cvv, expiryDate, cardHolder) {
  const span = tracer.scope().active();
  const cleaned = cardNumber.replace(/\s/g, '');

  // Track sensitive activity in Datadog ASM
  if (span) {
    // Custom Business Logic: Track sensitive activity
    span.setTag('appsec.security_activity', 'business_logic.payment.card_validation');
    span.setTag('payment.validation.attempt', true);
    span.setTag('payment.card_brand', detectCardBrand(cardNumber));
    // VULNERABILITY: Logging partial card number (should NEVER do this)
    span.setTag('payment.card_last4', cleaned.slice(-4));
    span.setTag('http.client_ip', span._spanContext._tags['http.client_ip'] || 'unknown');
  }

  // Basic validation
  if (!cleaned || cleaned.length < 13 || cleaned.length > 19) {
    if (span) {
      span.setTag('payment.validation.result', 'invalid_length');
      // Custom Business Logic: Payment failure
      span.setTag('appsec.security_activity', 'business_logic.payment.failure');
      span.setTag('appsec.events.payment.attempt.status', 'failed');
      span.setTag('payment.failure.type', 'invalid_card_length');
    }
    return {
      valid: false,
      error: 'Invalid card number length',
      code: 'INVALID_LENGTH'
    };
  }

  // Luhn check
  if (!luhnCheck(cleaned)) {
    if (span) {
      span.setTag('payment.validation.result', 'luhn_failed');
      // Custom Business Logic: Payment failure
      span.setTag('appsec.security_activity', 'business_logic.payment.failure');
      span.setTag('appsec.events.payment.attempt.status', 'failed');
      span.setTag('payment.failure.type', 'invalid_card_checksum');
    }
    return {
      valid: false,
      error: 'Invalid card number (failed checksum)',
      code: 'INVALID_CHECKSUM'
    };
  }

  // Check if it's a test card
  const testCard = ALL_TEST_CARDS[cleaned];
  const brand = detectCardBrand(cardNumber);

  if (testCard) {
    if (span) {
      span.setTag('payment.test_card', true);
      span.setTag('payment.test_card.response', testCard.response);
      span.setTag('payment.card_type', testCard.type);

      if (testCard.response === 'APPROVED') {
        // Custom Business Logic: Payment attempt successful
        span.setTag('appsec.security_activity', 'business_logic.payment.attempt');
        span.setTag('appsec.events.payment.attempt.status', 'success');
        span.setTag('payment.validation.result', 'approved');
      } else {
        // Custom Business Logic: Payment failure
        span.setTag('appsec.security_activity', 'business_logic.payment.failure');
        span.setTag('appsec.events.payment.attempt.status', 'failed');
        span.setTag('payment.failure.type', 'card_declined');
        span.setTag('payment.validation.result', testCard.response.toLowerCase());
        span.setTag('payment.decline_reason', testCard.reason);
      }
    }

    return {
      valid: true,
      isTestCard: true,
      brand: testCard.brand,
      type: testCard.type,
      response: testCard.response,
      reason: testCard.reason,
      lastFour: cleaned.slice(-4)
    };
  }

  // For non-test cards (in a real app, you'd call a payment processor)
  // VULNERABILITY: Accepting any card that passes Luhn check
  if (span) {
    span.setTag('payment.test_card', false);
    span.setTag('payment.validation.result', 'accepted_non_test');
    // Custom Business Logic: Payment attempt with non-test card
    span.setTag('appsec.security_activity', 'business_logic.payment.attempt');
    span.setTag('appsec.events.payment.attempt.status', 'success');
    span.setTag('payment.attempt.type', 'non_test_card');
    span.setTag('vulnerability.type', 'payment_validation_bypass');
  }

  return {
    valid: true,
    isTestCard: false,
    brand: brand,
    type: 'Unknown',
    response: 'APPROVED',
    lastFour: cleaned.slice(-4),
    warning: 'Non-test card accepted (insecure)'
  };
}

/**
 * Validate coupon code
 * VULNERABILITY: Intentionally weak coupon validation
 */
function validateCoupon(couponCode, userId) {
  const span = tracer.scope().active();

  // Track coupon validation attempt
  if (span) {
    // Custom Business Logic: Track sensitive activity
    span.setTag('appsec.security_activity', 'business_logic.coupon.validation');
    span.setTag('coupon.validation.attempt', true);
    span.setTag('coupon.code', couponCode); // VULNERABILITY: Logging coupon code
    span.setTag('usr.id', userId);
  }

  // VULNERABILITY: Any numeric coupon code always fails
  // This is to generate payment.failure events for testing
  if (/^\d+$/.test(couponCode)) {
    if (span) {
      span.setTag('coupon.validation.result', 'failed');
      span.setTag('coupon.failure.reason', 'numeric_code_rejected');

      // Custom Business Logic: Track payment failure
      span.setTag('appsec.security_activity', 'business_logic.payment.failure');
      span.setTag('appsec.events.payment.attempt.status', 'failed');
      span.setTag('payment.failure.type', 'coupon_fraud');
      span.setTag('payment.failure.reason', 'numeric_code_rejected');
    }

    return {
      valid: false,
      error: 'Invalid coupon code',
      message: 'This coupon code is not valid or has expired',
      discount: 0
    };
  }

  // Valid coupons (case-insensitive)
  const validCoupons = {
    'PIZZA10': { discount: 10, type: 'percentage', description: '10% off' },
    'PIZZA20': { discount: 20, type: 'percentage', description: '20% off' },
    'COFFEE5': { discount: 5, type: 'fixed', description: 'R$ 5 off' },
    'WELCOME': { discount: 15, type: 'percentage', description: '15% off first order' },
    'DATADOG': { discount: 25, type: 'percentage', description: '25% off (special)' },
  };

  const upperCode = couponCode.toUpperCase();
  const coupon = validCoupons[upperCode];

  if (coupon) {
    if (span) {
      span.setTag('coupon.validation.result', 'success');
      span.setTag('coupon.discount_type', coupon.type);
      span.setTag('coupon.discount_value', coupon.discount);

      // Custom Business Logic: Coupon successfully applied
      span.setTag('appsec.security_activity', 'business_logic.coupon.applied');
    }

    return {
      valid: true,
      discount: coupon.discount,
      type: coupon.type,
      description: coupon.description,
      code: upperCode
    };
  }

  // Invalid coupon
  if (span) {
    span.setTag('coupon.validation.result', 'invalid');

    // Custom Business Logic: Invalid coupon = payment failure
    span.setTag('appsec.security_activity', 'business_logic.payment.failure');
    span.setTag('appsec.events.payment.attempt.status', 'failed');
    span.setTag('payment.failure.type', 'invalid_coupon');
  }

  return {
    valid: false,
    error: 'Invalid coupon code',
    message: 'This coupon code is not valid',
    discount: 0
  };
}

module.exports = {
  validateCard,
  validateCoupon,
  detectCardBrand,
  luhnCheck,
  MASTERCARD_TEST_CARDS,
  OTHER_TEST_CARDS
};
