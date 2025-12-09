# Testing Custom ASM Business Logic Events

## Overview

The payment validation system now generates **Custom Business Logic Events** for Datadog ASM using the correct tag format:

- ✅ `appsec.security_activity` - Business logic activity type
- ✅ `appsec.events.payment.attempt.status` - Payment attempt status (success/failed)

## Tag Format (Important!)

Datadog ASM requires specific tag names for fraud detection:

```javascript
// ✅ CORRECT - Will appear in ASM for fraud detection
span.setTag('appsec.security_activity', 'business_logic.payment.failure');
span.setTag('appsec.events.payment.attempt.status', 'failed');

// For successful payments
span.setTag('appsec.security_activity', 'business_logic.payment.attempt');
span.setTag('appsec.events.payment.attempt.status', 'success');

// ❌ INCORRECT - Old format (deprecated)
span.setTag('appsec.events.users.payment.failure', true);
span.setTag('appsec.events.users.payment.attempt', true);
```

**Key Points:**
- Use `appsec.security_activity` with business logic type values
- Use `appsec.events.payment.attempt.status` with "success" or "failed"
- Add contextual tags like `payment.failure.type`, `payment.failure.reason`

## Testing Numeric Coupon (Payment Failure Event)

### Test Case: Numeric Coupon Rejection

**Goal:** Generate `appsec.security_activity:business_logic.payment.failure` event

**Steps:**

1. **Login and add items to cart:**
```bash
curl -c cookies.txt -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=admin&password=admin123"

curl -b cookies.txt -X POST http://localhost:3000/orders/cart/add \
  -H "Content-Type: application/json" \
  -d '{"productId": 1, "quantity": 2}'
```

2. **Navigate to checkout:**
```
http://localhost:3000/orders/checkout
```

3. **Try numeric coupon codes:**
   - `123` ❌ Will fail
   - `456789` ❌ Will fail
   - `999` ❌ Will fail
   - Any all-numeric code will fail

4. **Expected result:**
   - Error message: "This coupon code is not valid or has expired"
   - ASM event generated with tags:

```javascript
{
  "appsec.security_activity": "business_logic.payment.failure",
  "appsec.events.payment.attempt.status": "failed",
  "payment.failure.type": "coupon_fraud",
  "payment.failure.reason": "numeric_code_rejected",
  "coupon.validation.result": "failed",
  "coupon.code": "123",
  "usr.id": "1"
}
```

### Test Case: Valid Coupon (Activity Sensitive Event)

**Goal:** Generate `appsec.security_activity:business_logic.payment.card_validation` event

**Steps:**

1. Try valid coupon codes:
   - `PIZZA10` ✅ 10% off
   - `PIZZA20` ✅ 20% off
   - `DATADOG` ✅ 25% off

2. **Expected result:**
   - Success message: "✓ 20% off applied!"
   - Discount shown in order summary
   - ASM event generated with tags:

```javascript
{
  "appsec.security_activity": "business_logic.coupon.applied",
  "coupon.validation.result": "success",
  "coupon.discount_type": "percentage",
  "coupon.discount_value": 20,
  "coupon.code": "PIZZA20",
  "usr.id": "1"
}
```

## Testing Card Validation (Payment Events)

### Test Case: Declined Card (Payment Failure)

**Goal:** Generate `appsec.security_activity:business_logic.payment.failure` event

**Steps:**

1. Add items and go to checkout
2. Enter declined test card:
   - Card: `5555 5555 5555 5557`
   - Name: `John Doe`
   - Expiry: `12/25`
   - CVV: `123`

3. **Expected result:**
   - Error: "Payment declined - GENERIC_DECLINE"
   - ASM event with tags:

```javascript
{
  "appsec.security_activity": "business_logic.payment.failure",
  "appsec.events.payment.attempt.status": "failed",
  "payment.failure.type": "card_declined",
  "payment.failure.reason": "GENERIC_DECLINE",
  "payment.test_card": true,
  "payment.card_brand": "Mastercard",
  "payment.validation.result": "declined"
}
```

### Test Case: Approved Card (Payment Attempt)

**Goal:** Generate `appsec.events.payment.attempt.status:success` event

**Steps:**

1. Add items and go to checkout
2. Enter approved test card:
   - Card: `5555 5555 5555 4444`
   - Name: `John Doe`
   - Expiry: `12/25`
   - CVV: `123`

3. **Expected result:**
   - Success: "Payment processed successfully"
   - ASM event with tags:

```javascript
{
  "appsec.security_activity": "business_logic.payment.attempt",
  "appsec.events.payment.attempt.status": "success",
  "payment.test_card": true,
  "payment.card_brand": "Mastercard",
  "payment.validation.result": "approved",
  "payment.amount": 45.99
}
```

### Test Case: Invalid Card (Payment Failure)

**Goal:** Generate `appsec.security_activity:business_logic.payment.failure` event

**Steps:**

1. Enter invalid card number:
   - Card: `1234 5678 9012 3456` (fails Luhn check)

2. **Expected result:**
   - Error: "Invalid card number (failed checksum)"
   - ASM event with tags:

```javascript
{
  "appsec.security_activity": "business_logic.payment.failure",
  "appsec.events.payment.attempt.status": "failed",
  "payment.failure.type": "invalid_card_checksum",
  "payment.validation.result": "luhn_failed"
}
```

## View Events in Datadog

### 1. APM Traces

Navigate to **APM > Traces** and filter by:

```
@appsec.events.payment.attempt.status:failed OR @appsec.security_activity:business_logic.payment.failure
```

or

```
@appsec.security_activity:business_logic.payment.*
```

### 2. Security Signals

Navigate to **Security > Application Security > Signals**

Look for custom business logic signals showing:
- Payment failures with reasons
- Coupon fraud attempts
- Sensitive activity tracking

### 3. Logs with Trace Correlation

Navigate to **Logs** and filter:

```
@payment.failure.type:coupon_fraud
```

Logs are in JSON format and automatically correlated with traces via:
- `dd.trace_id`
- `dd.span_id`

Example log:
```json
{
  "level": "warn",
  "message": "Coupon validation failed",
  "timestamp": "2025-12-08T10:30:45.123Z",
  "user_id": 1,
  "coupon_code": "123",
  "error": "Invalid coupon code",
  "dd": {
    "trace_id": "1234567890123456789",
    "span_id": "9876543210987654"
  }
}
```

## Create Custom Detection Rules

### Rule 1: Coupon Fraud Detection

```
@appsec.events.payment.attempt.status:failed OR @appsec.security_activity:business_logic.payment.failure AND @payment.failure.type:coupon_fraud
```

**Alert when:**
- More than 5 numeric coupon attempts in 10 minutes (same user)
- More than 20 numeric coupon attempts in 1 hour (same IP)

### Rule 2: Card Testing/Fraud

```
@appsec.events.payment.attempt.status:failed OR @appsec.security_activity:business_logic.payment.failure AND @payment.failure.type:card_declined
```

**Alert when:**
- More than 3 declined cards in 5 minutes (same user)
- More than 10 declined cards in 10 minutes (same IP)

### Rule 3: Invalid Card Pattern

```
@appsec.events.payment.attempt.status:failed OR @appsec.security_activity:business_logic.payment.failure AND @payment.failure.type:invalid_card_checksum
```

**Alert when:**
- Multiple invalid card attempts (potential testing/fuzzing)

## Database Cleanup

### Automatic Cleanup (Recommended)

Use the provided script:

```bash
# Stop containers + cleanup users + keep data
./docker-down.sh

# Stop containers + cleanup users + DELETE ALL DATA
./docker-down.sh -v

# Stop containers only (no cleanup)
./docker-down.sh --skip-cleanup
```

### Manual Docker Compose

```bash
# Stop and keep data
docker-compose down

# Stop and DELETE ALL DATA (including database)
docker-compose down -v
```

**Important:**
- `-v` flag removes the `mysql_data` volume
- This **permanently deletes** all orders, payments, users, etc.
- Use `-v` for clean testing sessions

## Complete Test Workflow

### 1. Start Fresh

```bash
# Stop everything and clean database
docker-compose down -v

# Start services
docker-compose up -d

# Initialize database
docker-compose exec app npm run init-db

# Check logs
docker-compose logs -f app
```

### 2. Test Numeric Coupon Fraud

```bash
# Login
curl -c cookies.txt -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=admin&password=admin123"

# Validate numeric coupon (will fail)
curl -b cookies.txt -X POST http://localhost:3000/payment/coupon/validate \
  -H "Content-Type: application/json" \
  -d '{"couponCode": "123"}'

# Expected response:
# {"success":false,"valid":false,"error":"Invalid coupon code","message":"This coupon code is not valid or has expired","discount":0}
```

### 3. Check Datadog

Wait 10-30 seconds, then check:
- APM Traces: Look for span with `@appsec.events.payment.attempt.status:failed OR @appsec.security_activity:business_logic.payment.failure`
- Logs: Filter by `@coupon.failure.reason:numeric_code_rejected`
- Security Signals: Custom business logic signal

### 4. Test Valid Coupon

```bash
curl -b cookies.txt -X POST http://localhost:3000/payment/coupon/validate \
  -H "Content-Type: application/json" \
  -d '{"couponCode": "PIZZA20"}'

# Expected: Success with 20% discount
```

### 5. Test Declined Card

Use browser:
1. Go to `http://localhost:3000/orders/checkout`
2. Enter card: `5555 5555 5555 5557`
3. Complete checkout
4. See "Payment declined" error
5. Check Datadog for `payment.failure` event

### 6. Clean Up

```bash
# Stop and keep data for further testing
docker-compose down

# Or completely clean database
docker-compose down -v
```

## Troubleshooting

### Events Not Appearing in Datadog

**Check:**

1. **Datadog Agent is running:**
```bash
docker-compose ps datadog-agent
docker-compose logs datadog-agent | grep -i "forwarder\|api"
```

2. **ASM is enabled:**
```bash
docker-compose exec app env | grep DD_APPSEC
# Should show: DD_APPSEC_ENABLED=true
```

3. **Spans are being created:**
```bash
docker-compose logs app | jq 'select(.dd.trace_id)'
```

4. **API key is valid:**
```bash
# Check .env file
cat .env | grep DD_API_KEY
```

### Logs Not in JSON Format

**Fix:** Restart the app container to apply logger changes:

```bash
docker-compose restart app
docker-compose logs -f app
```

### Coupon Validation Not Failing for Numbers

**Check:**

1. **Test with API directly:**
```bash
curl -b cookies.txt -X POST http://localhost:3000/payment/coupon/validate \
  -H "Content-Type: application/json" \
  -d '{"couponCode": "999"}'
```

2. **Check app logs:**
```bash
docker-compose logs app | jq 'select(.message | contains("Coupon"))'
```

## Summary

✅ **Custom ASM Events Implemented:**
- `appsec.security_activity` with business logic types (payment.failure, payment.attempt, etc.)
- `appsec.events.payment.attempt.status` with "success" or "failed" values
- Full fraud detection support for Datadog ASM

✅ **Numeric Coupon = Payment Failure:**
- Any numeric code (123, 456, etc.) triggers payment.failure event
- Logged as "coupon_fraud" with reason "numeric_code_rejected"

✅ **Logs in JSON Format:**
- All logs output as JSON with Datadog trace correlation
- Includes dd.trace_id and dd.span_id for linking

✅ **Database Cleanup:**
- Use `docker-compose down -v` to delete all data
- Or `./docker-down.sh -v` for cleanup + delete

Now test it and watch the events flow into Datadog! 🎯
