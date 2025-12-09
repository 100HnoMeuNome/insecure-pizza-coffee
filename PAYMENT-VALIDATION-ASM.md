# Payment Validation & Custom ASM Business Logic Events

## Overview

This document describes the enhanced payment validation system with credit card validation based on Mastercard test data and coupon discount functionality. The system generates **Custom Business Logic events** for Datadog ASM fraud detection:

- `appsec.security_activity` - Business logic activity types (payment.failure, payment.attempt, coupon.applied, etc.)
- `appsec.events.payment.attempt.status` - Payment attempt status ("success" or "failed")
- Additional context tags for detailed fraud analysis

## Features

### 1. Credit Card Validation

Based on [Mastercard Unified Checkout Solutions Test Data](https://developer.mastercard.com/unified-checkout-solutions/documentation/testing/test_data/)

#### Test Cards - Approved Transactions

| Card Number | Brand | Type | Response |
|-------------|-------|------|----------|
| 5555555555554444 | Mastercard | Credit | APPROVED |
| 2223000048410010 | Mastercard | Credit | APPROVED |
| 5100060000000002 | Mastercard | Debit | APPROVED |
| 5100290029002909 | Mastercard | Prepaid | APPROVED |
| 4111111111111111 | Visa | Credit | APPROVED |
| 378282246310005 | American Express | Credit | APPROVED |

#### Test Cards - Declined Transactions

| Card Number | Brand | Reason |
|-------------|-------|--------|
| 5555555555555557 | Mastercard | GENERIC_DECLINE |
| 5105105105105100 | Mastercard | INSUFFICIENT_FUNDS |
| 5555555555556666 | Mastercard | INVALID_CVV |
| 4000000000000002 | Visa | GENERIC_DECLINE |
| 371449635398431 | American Express | INSUFFICIENT_FUNDS |

#### Test Cards - Error Scenarios

| Card Number | Brand | Error |
|-------------|-------|-------|
| 5555555555558888 | Mastercard | CARD_EXPIRED |
| 5555555555559999 | Mastercard | INVALID_CARD |

### 2. Coupon Discount System

#### Valid Coupons

| Code | Discount | Type | Description |
|------|----------|------|-------------|
| PIZZA10 | 10% | Percentage | 10% off |
| PIZZA20 | 20% | Percentage | 20% off |
| COFFEE5 | R$ 5 | Fixed | R$ 5 off |
| WELCOME | 15% | Percentage | 15% off first order |
| DATADOG | 25% | Percentage | 25% off (special) |

#### Intentional Vulnerability

**Any numeric coupon code (e.g., "123", "456789") will always fail** to generate `payment.failure` events for testing ASM detection.

## Datadog ASM Custom Events

### Event 1: Payment Processing

Tracks payment business logic activities.

**Trigger Points:**
- Payment processing initiated
- Coupon validation attempt
- Payment success or failure

**Span Tags:**
```javascript
// Payment processing started
span.setTag('appsec.security_activity', 'business_logic.payment.processing');

// Card validation
span.setTag('appsec.security_activity', 'business_logic.payment.card_validation');

// Coupon validation
span.setTag('appsec.security_activity', 'business_logic.coupon.validation');

// Coupon applied successfully
span.setTag('appsec.security_activity', 'business_logic.coupon.applied');
```

**Example Use Cases:**
- Track all payment processing attempts
- Monitor coupon usage patterns
- Audit sensitive financial transactions

### Event 2: payment.attempt.status

Tracks payment transaction success or failure.

**Trigger Points:**
- Successful payment completed
- Payment attempt failed

**Span Tags:**
```javascript
// Successful payment
span.setTag('appsec.security_activity', 'business_logic.payment.attempt');
span.setTag('appsec.events.payment.attempt.status', 'success');
span.setTag('payment.card_validation.started', true);
span.setTag('payment.method', 'credit_card');
span.setTag('payment.amount', 45.99);
span.setTag('payment.card_brand', 'Mastercard');
```

**Example Use Cases:**
- Track payment attempt volume
- Monitor payment success rates
- Detect unusual payment patterns
- Track payment method preferences

### Event 3: payment.failure

Tracks failed payment transactions with detailed reasons.

**Trigger Points:**
- Invalid card number (failed Luhn check)
- Declined transactions (test cards)
- Invalid coupon codes (especially numeric ones for fraud detection)
- Payment processing errors

**Span Tags:**
```javascript
// Card validation failures
span.setTag('appsec.security_activity', 'business_logic.payment.failure');
span.setTag('appsec.events.payment.attempt.status', 'failed');
span.setTag('payment.failure.type', 'invalid_card_length');
span.setTag('payment.failure.type', 'invalid_card_checksum');
span.setTag('payment.failure.type', 'card_declined');
span.setTag('payment.failure.reason', 'GENERIC_DECLINE');
span.setTag('payment.failure.reason', 'INSUFFICIENT_FUNDS');
span.setTag('payment.failure.reason', 'INVALID_CVV');

// Coupon fraud detection
span.setTag('appsec.security_activity', 'business_logic.payment.failure');
span.setTag('appsec.events.payment.attempt.status', 'failed');
span.setTag('payment.failure.type', 'coupon_fraud');
span.setTag('payment.failure.reason', 'numeric_code_rejected');
span.setTag('coupon.validation.result', 'failed');
```

**Example Use Cases:**
- Monitor payment decline rates
- Identify problematic payment flows
- Detect fraud attempts
- Track coupon abuse patterns

## Testing the Features

### Test 1: Successful Payment with Approved Card

```bash
# 1. Login
curl -c cookies.txt -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=admin&password=admin123"

# 2. Add items to cart
curl -b cookies.txt -X POST http://localhost:3000/orders/cart/add \
  -H "Content-Type: application/json" \
  -d '{"productId": 1, "quantity": 2}'

# 3. Go to checkout (browser)
# Navigate to: http://localhost:3000/orders/checkout

# 4. Enter card details:
# Card Number: 5555 5555 5555 4444
# Card Holder: John Doe
# Expiry: 12/25
# CVV: 123

# Expected Result:
# ✅ Payment successful
# Datadog Tags:
# - appsec.security_activity: payment.processing
# - appsec.events.payment.attempt: credit_card
# - payment.validation.result: success
```

### Test 2: Declined Payment

```bash
# Follow steps 1-2 from Test 1

# 3. Enter card details:
# Card Number: 5555 5555 5555 5557 (DECLINED)
# Card Holder: John Doe
# Expiry: 12/25
# CVV: 123

# Expected Result:
# ❌ Payment declined: GENERIC_DECLINE
# Datadog Tags:
# - appsec.events.payment.failure: true
# - payment.failure.reason: GENERIC_DECLINE
# - payment.validation.result: declined
# - payment.card_brand: Mastercard
```

### Test 3: Invalid Card Number

```bash
# Follow steps 1-2 from Test 1

# 3. Enter card details:
# Card Number: 1234 5678 9012 3456 (Invalid)
# Card Holder: John Doe
# Expiry: 12/25
# CVV: 123

# Expected Result:
# ❌ Payment failed: Invalid card number (failed checksum)
# Datadog Tags:
# - appsec.events.payment.failure: true
# - payment.failure.reason: INVALID_CHECKSUM
# - payment.validation.result: luhn_failed
```

### Test 4: Valid Coupon

```bash
# Follow steps 1-3 from Test 1

# 4. Apply coupon before payment:
# Coupon Code: PIZZA20

# Expected Result:
# ✅ 20% off applied
# Subtotal updated with discount
# Datadog Tags:
# - appsec.security_activity: coupon.validation
# - appsec.security_activity: coupon.applied
# - coupon.validation.result: success
# - coupon.discount_type: percentage
# - coupon.discount_value: 20
```

### Test 5: Invalid Coupon (Numeric - Fraud Detection)

```bash
# Follow steps 1-3 from Test 1

# 4. Try numeric coupon:
# Coupon Code: 123456

# Expected Result:
# ❌ Invalid coupon code
# Datadog Tags:
# - appsec.security_activity: coupon.fraud_attempt
# - appsec.events.payment.failure: true
# - coupon.validation.result: failed
# - coupon.failure.reason: numeric_code_rejected
```

### Test 6: Multiple Failure Scenarios

```bash
# Test different declined cards in sequence:

# A. Insufficient Funds
Card: 5105 1051 0510 5100
Expected: INSUFFICIENT_FUNDS

# B. Invalid CVV
Card: 5555 5555 5555 6666
Expected: INVALID_CVV

# C. Expired Card
Card: 5555 5555 5555 8888
Expected: CARD_EXPIRED

# Each will generate payment.failure events with specific reasons
```

## Monitoring in Datadog

### Create Custom Detection Rules

#### Rule 1: Detect Payment Fraud Attempts

```
@appsec.events.payment.attempt.status:failed OR @appsec.security_activity:business_logic.payment.failure
```

Alert when:
- More than 5 failed payments from same user in 5 minutes
- More than 10 failed payments from same IP in 10 minutes

#### Rule 2: Monitor Coupon Abuse

```
@appsec.security_activity:business_logic.payment.failure AND @payment.failure.type:coupon_fraud
```

Alert when:
- Multiple numeric coupon attempts (potential fraud)
- High volume of invalid coupon attempts

#### Rule 3: Track Payment Success Rate

```
@appsec.security_activity:business_logic.payment.* OR @appsec.events.payment.attempt.status:*
```

Create dashboard showing:
- Payment success vs failure rate
- Common decline reasons
- Payment volume by card brand

### View Events in Datadog

1. **APM Traces**
   - Navigate to APM > Traces
   - Filter: `@appsec.events.payment.attempt.status:failed`
   - View: Failed payment details with reasons

2. **Security Signals**
   - Navigate to Security > Application Security
   - Custom signals created from business logic events
   - Track suspicious payment patterns

3. **Log Correlation**
   - Navigate to Logs
   - Filter: `@payment.validation.result:declined`
   - Correlated with APM traces automatically

## Implementation Details

### File Structure

```
src/
├── utils/
│   └── cardValidator.js          # Card validation logic with Mastercard test data
├── routes/
│   └── payment.js                # Payment processing with ASM events
├── views/
│   └── checkout.ejs              # Updated checkout UI with coupon field
└── public/
    └── js/
        └── main.js               # Frontend validation and coupon handling
```

### Key Functions

#### cardValidator.js

```javascript
validateCard(cardNumber, cvv, expiryDate, cardHolder)
// Returns: { valid, isTestCard, brand, type, response, reason, lastFour }

validateCoupon(couponCode, userId)
// Returns: { valid, discount, type, description, code, error }

luhnCheck(cardNumber)
// Returns: boolean (Luhn algorithm validation)

detectCardBrand(cardNumber)
// Returns: 'Mastercard' | 'Visa' | 'American Express' | 'Unknown'
```

#### Payment Events Flow

```
1. User submits payment
   ↓
2. Validate coupon (if provided)
   → Tag: appsec.security_activity = coupon.validation
   ↓
3. Validate credit card
   → Tag: appsec.events.payment.attempt.status = success
   ↓
4a. Card Valid + Approved
   → Tag: payment.validation.result = success
   → Process payment
   ↓
4b. Card Invalid
   → Tag: appsec.events.payment.attempt.status = failed
   → Tag: payment.failure.reason = [error code]
   → Return error
   ↓
4c. Card Declined
   → Tag: appsec.events.payment.attempt.status = failed
   → Tag: payment.failure.reason = [decline reason]
   → Return decline message
```

## Security Considerations

### Intentional Vulnerabilities (For Testing)

⚠️ **This implementation contains intentional vulnerabilities:**

1. **Plaintext Storage**: Card numbers and CVVs stored unencrypted
2. **Client-Side Validation**: Card validation on client side (insecure)
3. **Server-Side Card Handling**: Processing cards on application server (not PCI compliant)
4. **SQL Injection**: Payment queries vulnerable to SQL injection
5. **Sensitive Data in Logs**: Card details logged (GDPR/PCI violation)
6. **Sensitive Data in APM**: Full card numbers in span tags (insecure)

### Production Best Practices

In a real application, **NEVER**:
- Store credit card numbers (use tokens from payment processors)
- Validate cards on your own servers (use Stripe, PayPal, etc.)
- Log sensitive payment data
- Send card details to APM/monitoring
- Handle payments without PCI compliance

**Instead:**
- Use PCI-compliant payment gateways (Stripe, Braintree, Adyen)
- Store only tokenized references
- Never log card numbers or CVVs
- Use end-to-end encryption
- Implement proper fraud detection

## Custom Business Logic Benefits

### Why Use Custom ASM Events?

1. **Business Context**: Track business-specific events beyond security threats
2. **Fraud Detection**: Identify suspicious payment patterns
3. **User Behavior**: Monitor legitimate vs fraudulent transactions
4. **Compliance**: Audit trail for payment activities
5. **Analytics**: Business intelligence on payment flows
6. **Alerting**: Real-time notifications on payment issues

### Integration with ASM Protection

Custom events can trigger:
- **User Blocking**: Block users with repeated payment fraud
- **IP Blocking**: Block IPs with suspicious payment patterns
- **Rate Limiting**: Throttle payment attempts
- **Custom Rules**: Create business logic-based security rules

## API Endpoints

### POST /payment/coupon/validate

Validate a coupon code.

**Request:**
```json
{
  "couponCode": "PIZZA20"
}
```

**Response (Success):**
```json
{
  "success": true,
  "valid": true,
  "discount": 20,
  "type": "percentage",
  "description": "20% off",
  "code": "PIZZA20"
}
```

**Response (Failure):**
```json
{
  "success": false,
  "valid": false,
  "error": "Invalid coupon code",
  "message": "This coupon code is not valid",
  "discount": 0
}
```

### POST /payment/process

Process payment with card validation.

**Request:**
```json
{
  "orderId": 123,
  "paymentMethod": "credit_card",
  "cardNumber": "5555555555554444",
  "cardHolder": "John Doe",
  "expiryDate": "12/25",
  "cvv": "123",
  "couponCode": "PIZZA20"
}
```

**Response (Success):**
```json
{
  "success": true,
  "transactionId": "TXN-1234567890-abc123",
  "orderId": 123,
  "amount": 39.99,
  "discount": 10.00,
  "coupon": "PIZZA20",
  "message": "Payment processed successfully"
}
```

**Response (Declined):**
```json
{
  "success": false,
  "error": "Payment declined",
  "reason": "INSUFFICIENT_FUNDS",
  "declined": true
}
```

**Response (Invalid Card):**
```json
{
  "success": false,
  "error": "Invalid card number (failed checksum)",
  "code": "INVALID_CHECKSUM"
}
```

## Troubleshooting

### Issue: Coupon validation not working

**Check:**
1. User is logged in (requires authentication)
2. Coupon code is spelled correctly (case-insensitive)
3. Check browser console for errors
4. Verify `/payment/coupon/validate` endpoint is accessible

### Issue: Card validation always fails

**Check:**
1. Card number passes Luhn checksum
2. Using supported card brands (Mastercard, Visa, Amex)
3. Card number length is correct (13-19 digits)
4. Test cards are typed exactly as documented

### Issue: ASM events not appearing

**Check:**
1. Datadog APM is enabled (`DD_TRACE_ENABLED=true`)
2. Datadog ASM is enabled (`DD_APPSEC_ENABLED=true`)
3. Datadog agent is running and reachable
4. Check logs for Datadog tracer errors
5. Verify spans are being created in traces

### Issue: Payment processing fails

**Check:**
1. Database connection is working
2. Orders table has the order ID
3. Payment_transactions table exists
4. Check server logs for detailed error messages

## References

- [Mastercard Test Cards](https://developer.mastercard.com/unified-checkout-solutions/documentation/testing/test_data/)
- [Datadog ASM Documentation](https://docs.datadoghq.com/security/application_security/)
- [Custom Business Logic](https://docs.datadoghq.com/security/application_security/threats/add-user-info/)
- [Luhn Algorithm](https://en.wikipedia.org/wiki/Luhn_algorithm)
- [PCI DSS Compliance](https://www.pcisecuritystandards.org/)

---

**⚠️ Remember**: This is an intentionally vulnerable application for security testing and training purposes. **NEVER** deploy to production or handle real payment data!
