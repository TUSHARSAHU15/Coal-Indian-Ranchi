const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const mongoose = require('mongoose');
const { app, server } = require('../../server');
const { encryptPII, decryptPII, hashGovtId } = require('./cryptoUtils');
const authService = require('../services/authService');
const visitorService = require('../services/visitorService');
const gateService = require('../services/gateService');
const Visitor = require('../models/Visitor');
const User = require('../models/User');
const Department = require('../models/Department');

const runE2ETests = async () => {
  console.log('========================================================');
  console.log('  CCL DVMS v2.0 Enterprise Backend E2E Test Suite');
  console.log('========================================================\n');

  let passed = 0;
  let failed = 0;

  const assert = (condition, testName) => {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName}`);
      failed++;
    }
  };

  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/ccl-dvms';
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoUri);
    }

    // 1. Test Crypto Utils
    console.log('--- TEST 1: AES-256-GCM & SHA-256 Cryptography ---');
    const sampleGovtId = '9876-5432-1098';
    const encrypted = encryptPII(sampleGovtId);
    assert(encrypted && encrypted.includes(':'), 'PII encrypted with IV, AuthTag & Ciphertext');
    const decrypted = decryptPII(encrypted);
    assert(decrypted === sampleGovtId, 'PII decrypted cleanly to original value');
    const hash = hashGovtId(sampleGovtId);
    assert(hash && hash.length === 64, 'Deterministic SHA-256 hash generated for duplicate detection');

    // 2. Test User Authentication
    console.log('\n--- TEST 2: User Authentication & JWT Issuance ---');
    const authResult = await authService.loginUser({
      employeeId: 'EMP-ADMIN',
      password: 'Password@123'
    });
    assert(authResult.accessToken && !authResult.mfaRequired, 'Successful login returns valid JWT access token');
    assert(authResult.user.role === 'SUPER_ADMIN', 'User role correctly mapped in session');

    // 3. Test Visitor Registration
    console.log('\n--- TEST 3: Visitor Registration & Badge Generation ---');
    const host = await User.findOne({ employeeId: 'EMP-HOST01' });
    const dept = await Department.findOne({ code: 'HQ-RANCHI' });
    const securityUser = await User.findOne({ employeeId: 'EMP-SEC01' });

    const visitorData = {
      fullName: 'Vikramaditya Singh',
      mobile: `98${Math.floor(10000000 + Math.random() * 90000000)}`,
      email: 'vikram@example.com',
      govtIdType: 'Aadhaar Card',
      govtIdNumber: `5544-3322-${Math.floor(1000 + Math.random() * 9000)}`,
      hostEmployeeId: host._id,
      departmentId: dept._id,
      purpose: 'Technical Vendor Meeting for Mine Safety Equipment',
      visitDate: new Date(),
      expectedDuration: 3
    };

    const newVisitor = await visitorService.registerVisitor(visitorData);
    assert(newVisitor.visitorId && newVisitor.visitorId.startsWith('CCL-V-'), `Sequential visitor ID generated: ${newVisitor.visitorId}`);
    assert(newVisitor.passCode && newVisitor.passCode.length === 6, `Cryptographic 6-digit passcode generated: ${newVisitor.passCode}`);
    assert(newVisitor.status === 'PENDING', 'Initial visit status set to PENDING');
    assert(newVisitor.visitState === 'NOT_ARRIVED', 'Initial visit state set to NOT_ARRIVED');

    const qrDataUri = await visitorService.generatePassQR(newVisitor);
    assert(qrDataUri && qrDataUri.startsWith('data:image/png;base64,'), 'High-resolution QR Code Data URI generated');

    // 4. Test Host Approval Workflow
    console.log('\n--- TEST 4: Host Approval Workflow ---');
    const approvedVisitor = await visitorService.processApproval(newVisitor._id, {
      status: 'APPROVED',
      remarks: 'Approved for Headquarters entry'
    });
    assert(approvedVisitor.status === 'APPROVED' && approvedVisitor.approvedAt, 'Host employee successfully approved visit');

    // 5. Test Gate Check-in State Transition
    console.log('\n--- TEST 5: Gate Check-in State Transition ---');
    const checkInResult = await gateService.processGateScan({
      identifier: newVisitor.passCode,
      action: 'CHECK_IN',
      scannedBy: securityUser._id,
      gateNumber: 'Gate 01 - Main Entrance'
    });
    assert(checkInResult.success && checkInResult.action === 'CHECK_IN', 'Security scanner verified pass');
    assert(checkInResult.visitor.visitState === 'INSIDE', 'Visitor state transitioned to INSIDE');
    assert(checkInResult.visitor.checkedInAt, 'checkedInAt timestamp logged');

    // 6. Test Idempotency (Duplicate Scan Rejection)
    console.log('\n--- TEST 6: Gate Idempotency Guard (5-Second Buffer) ---');
    let duplicateRejected = false;
    try {
      await gateService.processGateScan({
        identifier: newVisitor.passCode,
        action: 'CHECK_IN',
        scannedBy: securityUser._id
      });
    } catch (err) {
      duplicateRejected = err.message.includes('Duplicate scan');
    }
    assert(duplicateRejected, 'Idempotency guard rejected duplicate scan within 5s');

    // 7. Test Gate Check-out State Transition
    console.log('\n--- TEST 7: Gate Check-out State Transition ---');
    // Wait for idempotency window
    await new Promise(resolve => setTimeout(resolve, 5200));

    const checkOutResult = await gateService.processGateScan({
      identifier: newVisitor.passCode,
      action: 'CHECK_OUT',
      scannedBy: securityUser._id,
      gateNumber: 'Gate 02 - Exit Gate'
    });
    assert(checkOutResult.success && checkOutResult.action === 'CHECK_OUT', 'Gate check-out processed successfully');
    assert(checkOutResult.visitor.visitState === 'EXITED', 'Visitor state transitioned to EXITED');
    assert(checkOutResult.visitor.checkedOutAt, 'checkedOutAt timestamp logged');

    // 8. Test Rejection for Already Exited
    console.log('\n--- TEST 8: Rejection on Re-Entry Attempt ---');
    await new Promise(resolve => setTimeout(resolve, 5200));
    let exitedRejected = false;
    try {
      await gateService.processGateScan({
        identifier: newVisitor.passCode,
        action: 'CHECK_IN',
        scannedBy: securityUser._id
      });
    } catch (err) {
      exitedRejected = err.message.includes('already completed this visit');
    }
    assert(exitedRejected, 'Gate rejected pass because visitor already exited');

    console.log('\n========================================================');
    console.log(`  Tests Passed: ${passed} | Tests Failed: ${failed}`);
    console.log('========================================================\n');

    await mongoose.disconnect();
    process.exit(failed > 0 ? 1 : 0);
  } catch (error) {
    console.error('Fatal Test Error:', error);
    process.exit(1);
  }
};

if (require.main === module) {
  runE2ETests();
}

module.exports = runE2ETests;
