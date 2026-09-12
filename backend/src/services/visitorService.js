const bcrypt = require('bcryptjs');
const QRCode = require('qrcode');
const Visitor = require('../models/Visitor');
const {
  encryptPII,
  decryptPII,
  hashGovtId,
  generatePassCode,
  generateSecureToken
} = require('../utils/cryptoUtils');
const { logAudit } = require('../utils/auditLogger');

/**
 * Generate sequential enterprise visitor ID (CCL-V-YYYY-XXXXX)
 */
const generateVisitorId = async () => {
  const year = new Date().getFullYear();
  const count = await Visitor.countDocuments();
  const sequence = String(count + 1).padStart(5, '0');
  return `CCL-V-${year}-${sequence}`;
};

/**
 * Register a new visitor with AES-256-GCM encryption & QR token generation
 */
const registerVisitor = async (data, req) => {
  const {
    fullName,
    mobile,
    email,
    govtIdType,
    govtIdNumber,
    photoUrl,
    hostEmployeeId,
    departmentId,
    purpose,
    visitDate,
    expectedDuration
  } = data;

  // Duplicate check via SHA-256 hash for active/pending visits today
  let govtIdHash = null;
  if (govtIdNumber) {
    govtIdHash = hashGovtId(govtIdNumber);
    const todayStart = new Date(visitDate || Date.now());
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(visitDate || Date.now());
    todayEnd.setHours(23, 59, 59, 999);

    const existingVisitor = await Visitor.findOne({
      govtIdHash,
      visitDate: { $gte: todayStart, $lte: todayEnd },
      status: { $in: ['PENDING', 'APPROVED'] }
    });

    if (existingVisitor) {
      throw new Error(`A visit registration already exists for this Government ID today (${existingVisitor.visitorId}).`);
    }
  }

  const visitorId = data.visitorId || (await generateVisitorId());
  const passCode = generatePassCode();
  const rawQrToken = generateSecureToken();
  const qrTokenHash = await bcrypt.hash(rawQrToken, 10);

  // Set pass expiration to End Of Day (23:59:59) of visitDate
  const targetDate = visitDate ? new Date(visitDate) : new Date();
  const expiresAt = new Date(targetDate);
  expiresAt.setHours(23, 59, 59, 999);

  // Encrypt sensitive PII
  const encryptedGovtId = govtIdNumber ? encryptPII(govtIdNumber) : undefined;

  const visitor = new Visitor({
    visitorId,
    fullName,
    mobile,
    email,
    govtIdType,
    govtIdNumber: encryptedGovtId,
    govtIdHash,
    photoUrl,
    hostEmployeeId,
    departmentId,
    purpose,
    visitDate: targetDate,
    expectedDuration: expectedDuration || 2,
    qrTokenHash,
    passCode,
    expiresAt,
    status: data.status || 'PENDING',
    visitState: 'NOT_ARRIVED'
  });

  const savedVisitor = await visitor.save();

  // Audit log entry
  await logAudit({
    entityType: 'VISITOR',
    entityId: savedVisitor._id,
    action: 'CREATE',
    req,
    details: { visitorId, fullName, hostEmployeeId, purpose }
  });

  // Attach raw credentials in return object for one-time badge generation/display
  const visitorObj = savedVisitor.toObject();
  visitorObj.rawQrToken = rawQrToken;
  visitorObj.passCode = passCode;

  return visitorObj;
};

/**
 * Generate QR SVG Data URL for digital pass
 */
const generatePassQR = async (visitor) => {
  const qrPayload = JSON.stringify({
    vId: visitor.visitorId,
    id: visitor._id,
    code: visitor.passCode,
    exp: visitor.expiresAt
  });

  const qrDataUri = await QRCode.toDataURL(qrPayload, {
    errorCorrectionLevel: 'H',
    margin: 2,
    color: {
      dark: '#003366',
      light: '#ffffff'
    }
  });

  return qrDataUri;
};

/**
 * Host employee approval or rejection of visit request
 */
const processApproval = async (visitorId, { status, remarks }, req) => {
  const visitor = await Visitor.findById(visitorId);
  if (!visitor) {
    throw new Error('Visitor record not found.');
  }

  if (visitor.status !== 'PENDING') {
    throw new Error(`Cannot change approval status. Visitor is already marked as ${visitor.status}.`);
  }

  visitor.status = status; // 'APPROVED' or 'REJECTED'
  if (status === 'APPROVED') {
    visitor.approvedAt = new Date();
  }

  const updatedVisitor = await visitor.save();

  // Audit log
  await logAudit({
    entityType: 'VISITOR',
    entityId: updatedVisitor._id,
    action: status === 'APPROVED' ? 'APPROVE' : 'REJECT',
    req,
    details: { visitorId: visitor.visitorId, status, remarks }
  });

  return updatedVisitor;
};

module.exports = {
  generateVisitorId,
  registerVisitor,
  generatePassQR,
  processApproval
};
