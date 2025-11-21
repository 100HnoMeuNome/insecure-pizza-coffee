#!/bin/bash

# Installation script for vulnerable packages
# WARNING: Only run this in isolated testing environments!

echo "============================================"
echo "Installing Vulnerable Packages for SCA Testing"
echo "============================================"
echo ""
echo "⚠️  WARNING: This will install packages with known security vulnerabilities!"
echo ""
echo "Packages to be installed:"
echo "  - pdfkit@0.11.0 (outdated, multiple vulnerabilities)"
echo "  - handlebars@4.5.3 (CVE-2019-19919, CVE-2019-20920, CVE-2021-23369)"
echo ""
echo "These packages should ONLY be installed in testing environments."
echo "They will be detected by Datadog's Software Composition Analysis (SCA)."
echo ""

read -p "Do you want to proceed? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "Installation cancelled."
    exit 0
fi

echo ""
echo "Attempting to install vulnerable packages..."
echo ""

# Try regular install first
npm install pdfkit@0.11.0 handlebars@4.5.3

if [ $? -ne 0 ]; then
    echo ""
    echo "❌ Installation blocked by security tools."
    echo ""
    echo "Your npm security framework is blocking these vulnerable packages."
    echo ""
    echo "Options:"
    echo "  1. Use --force flag (not recommended):"
    echo "     npm install --force pdfkit@0.11.0 handlebars@4.5.3"
    echo ""
    echo "  2. Disable npm audit temporarily:"
    echo "     npm config set audit false"
    echo "     npm install pdfkit@0.11.0 handlebars@4.5.3"
    echo "     npm config set audit true"
    echo ""
    echo "  3. Skip installation and test the error handling:"
    echo "     The print endpoint will show an error message with CVE information"
    echo ""
    exit 1
fi

echo ""
echo "✅ Vulnerable packages installed successfully!"
echo ""
echo "You can now test the Print Order feature:"
echo "  1. Start the application: npm start"
echo "  2. Login and place an order"
echo "  3. Go to My Orders: http://localhost:3000/orders/my-orders"
echo "  4. Click the '🖨️ Print Order' button"
echo ""
echo "Datadog ASM will detect:"
echo "  - Vulnerable package versions"
echo "  - Known CVEs and their severity"
echo "  - Recommended patches"
echo ""
echo "See VULNERABLE-PACKAGES.md for more information."
echo ""
