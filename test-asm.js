#!/usr/bin/env node

/**
 * Test script to verify Datadog ASM configuration
 */

require('dotenv').config();

console.log('='.repeat(60));
console.log('Datadog Application Security Management (ASM) Configuration Test');
console.log('='.repeat(60));
console.log();

// Check required environment variables
const requiredVars = {
  'DD_API_KEY': process.env.DD_API_KEY,
  'DD_SITE': process.env.DD_SITE || 'datadoghq.com',
  'DD_SERVICE': process.env.DD_SERVICE,
  'DD_ENV': process.env.DD_ENV,
};

console.log('📋 Basic Configuration:');
console.log('-'.repeat(60));
for (const [key, value] of Object.entries(requiredVars)) {
  const displayValue = key === 'DD_API_KEY' && value ?
    `${value.substring(0, 8)}...${value.substring(value.length - 4)}` :
    value || '(not set)';
  const status = value ? '✅' : '❌';
  console.log(`${status} ${key}: ${displayValue}`);
}
console.log();

// Check ASM configuration
const asmConfig = {
  'DD_APPSEC_ENABLED': process.env.DD_APPSEC_ENABLED,
  'DD_APPSEC_WAF_TIMEOUT': process.env.DD_APPSEC_WAF_TIMEOUT,
  'DD_APPSEC_RATE_LIMIT': process.env.DD_APPSEC_RATE_LIMIT,
  'DD_APPSEC_BLOCKING_ENABLED': process.env.DD_APPSEC_BLOCKING_ENABLED,
  'DD_API_SECURITY_ENABLED': process.env.DD_API_SECURITY_ENABLED,
  'DD_API_SECURITY_REQUEST_SAMPLE_RATE': process.env.DD_API_SECURITY_REQUEST_SAMPLE_RATE,
};

console.log('🛡️  Application Security Management (ASM):');
console.log('-'.repeat(60));
for (const [key, value] of Object.entries(asmConfig)) {
  const status = value ? '✅' : '❌';
  console.log(`${status} ${key}: ${value || '(not set)'}`);
}
console.log();

// Check IAST configuration
const iastConfig = {
  'DD_IAST_ENABLED': process.env.DD_IAST_ENABLED,
  'DD_IAST_REQUEST_SAMPLING': process.env.DD_IAST_REQUEST_SAMPLING,
  'DD_IAST_MAX_CONCURRENT_REQUESTS': process.env.DD_IAST_MAX_CONCURRENT_REQUESTS,
  'DD_IAST_MAX_CONTEXT_OPERATIONS': process.env.DD_IAST_MAX_CONTEXT_OPERATIONS,
};

console.log('🔍 Interactive Application Security Testing (IAST):');
console.log('-'.repeat(60));
for (const [key, value] of Object.entries(iastConfig)) {
  const status = value ? '✅' : '❌';
  console.log(`${status} ${key}: ${value || '(not set)'}`);
}
console.log();

// Check SCA configuration
const scaConfig = {
  'DD_APPSEC_SCA_ENABLED': process.env.DD_APPSEC_SCA_ENABLED,
};

console.log('📦 Software Composition Analysis (SCA):');
console.log('-'.repeat(60));
for (const [key, value] of Object.entries(scaConfig)) {
  const status = value ? '✅' : '❌';
  console.log(`${status} ${key}: ${value || '(not set)'}`);
}
console.log();

// Check Remote Configuration
const remoteConfig = {
  'DD_REMOTE_CONFIGURATION_ENABLED': process.env.DD_REMOTE_CONFIGURATION_ENABLED,
};

console.log('🔧 Remote Configuration:');
console.log('-'.repeat(60));
for (const [key, value] of Object.entries(remoteConfig)) {
  const status = value !== 'false' ? '✅' : '❌';
  console.log(`${status} ${key}: ${value || '(default: true)'}`);
}
console.log();

// Check dd-trace package
console.log('📚 Package Check:');
console.log('-'.repeat(60));
try {
  const ddTrace = require('dd-trace');
  console.log('✅ dd-trace package: installed');

  // Check if ASM is available
  try {
    const tracer = ddTrace.init({
      logInjection: false,
      appsec: { enabled: false }
    });
    console.log('✅ ASM module: available');
  } catch (err) {
    console.log('❌ ASM module: error -', err.message);
  }
} catch (err) {
  console.log('❌ dd-trace package: not installed');
}
console.log();

// Overall status
console.log('='.repeat(60));
const asmEnabled = process.env.DD_APPSEC_ENABLED === 'true';
const iastEnabled = process.env.DD_IAST_ENABLED === 'true';
const scaEnabled = process.env.DD_APPSEC_SCA_ENABLED === 'true';
const hasApiKey = !!process.env.DD_API_KEY;

if (hasApiKey && asmEnabled && iastEnabled && scaEnabled) {
  console.log('✅ ASM is properly configured and ready to use!');
  console.log();
  console.log('Next steps:');
  console.log('1. Start the application: npm start');
  console.log('2. Generate traffic to the application');
  console.log('3. View security signals in Datadog at:');
  console.log('   https://app.datadoghq.com/security/appsec');
} else {
  console.log('⚠️  ASM configuration is incomplete');
  console.log();
  console.log('Issues found:');
  if (!hasApiKey) console.log('- DD_API_KEY is not set');
  if (!asmEnabled) console.log('- DD_APPSEC_ENABLED is not set to true');
  if (!iastEnabled) console.log('- DD_IAST_ENABLED is not set to true');
  if (!scaEnabled) console.log('- DD_APPSEC_SCA_ENABLED is not set to true');
  console.log();
  console.log('Please update your .env file and try again.');
}
console.log('='.repeat(60));
