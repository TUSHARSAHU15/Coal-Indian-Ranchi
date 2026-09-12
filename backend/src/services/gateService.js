const Visitor = require('../models/Visitor');
const GateLog = require('../models/GateLog');
const { logAudit } = require('../utils/auditLogger');

// In-memory 5-second idempotency cache
const scanCache = new Map();

const clearStaleCache = () => {
  const now = Date.now();
  for (const [key, timestamp] of scanCache.entries()) {
    if (now - timestamp > 5000) {
      scanCache.delete(key);
    }
  }
};
setInterval(clearStaleCache, 10000);

/**
 * Unified Gate Scan & Check-in / Check-out Service
 */
const processGateScan = async ({
  identifier, // Can be passCode (6-digit), visitorId string, or MongoDB _id
  rawQrToken,
  action, // 'CHECK_IN' or 'CHECK_OUT' (if omitted, automatically inferred from visitState)
  scannedBy,
  gateNumber = 'Main Gate 01',
  geoLocation,
  io,
  req
}) => {
  // Idempotency check
  const cacheKey = `${identifier}_${scannedBy}`;
  const lastScan = scanCache.get(cacheKey);
  if (lastScan && Date.now() - lastScan < 5000) {
    throw new Error('Duplicate scan detected within 5 seconds. Please wait before rescanning.');
  }
  scanCache.set(cacheKey, Date.now());

  // Find visitor by passCode, visitorId, or _id
  let visitor = null;
  const isObjectId = /^[0-9a-fA-F]{24}$/.test(identifier);

  if (isObjectId) {
    visitor = await Visitor.findById(identifier).populate('departmentId hostEmployeeId');
  }
  if (!visitor) {
    visitor = await Visitor.findOne({
      $or: [{ passCode: identifier }, { visitorId: identifier }]
    }).populate('departmentId hostEmployeeId');
  }

  if (!visitor) {
    throw new Error('Invalid pass or visitor not found.');
  }

  // Check 1: Approval status
  if (visitor.status !== 'APPROVED') {
    await GateLog.create({
      visitorId: visitor._id,
      action: action || 'CHECK_IN',
      qrTokenVerified: false,
      rejectionReason: 'NOT_APPROVED',
      scannedBy,
      ipAddress: req ? req.ip : undefined
    });
    throw new Error(`Access Denied: Visitor pass is ${visitor.status}. Host approval required.`);
  }

  // Check 2: Pass expiration
  if (visitor.expiresAt && new Date() > new Date(visitor.expiresAt)) {
    visitor.status = 'EXPIRED';
    await visitor.save();

    await GateLog.create({
      visitorId: visitor._id,
      action: action || 'CHECK_IN',
      qrTokenVerified: false,
      rejectionReason: 'EXPIRED',
      scannedBy,
      ipAddress: req ? req.ip : undefined
    });
    throw new Error('Access Denied: Visitor pass has expired.');
  }

  // Check 3: State machine transition
  let determinedAction = action;

  if (!determinedAction) {
    // Auto-detect based on current state
    if (visitor.visitState === 'NOT_ARRIVED') determinedAction = 'CHECK_IN';
    else if (visitor.visitState === 'INSIDE') determinedAction = 'CHECK_OUT';
    else determinedAction = 'CHECK_IN';
  }

  if (determinedAction === 'CHECK_IN') {
    if (visitor.visitState === 'INSIDE') {
      throw new Error('Visitor is already checked inside the facility.');
    }
    if (visitor.visitState === 'EXITED') {
      await GateLog.create({
        visitorId: visitor._id,
        action: 'CHECK_IN',
        qrTokenVerified: true,
        rejectionReason: 'ALREADY_EXITED',
        scannedBy,
        ipAddress: req ? req.ip : undefined
      });
      throw new Error('Visitor has already completed this visit and exited.');
    }

    visitor.visitState = 'INSIDE';
    visitor.checkedInAt = new Date();
    visitor.gateIn = gateNumber;
  } else if (determinedAction === 'CHECK_OUT') {
    if (visitor.visitState !== 'INSIDE') {
      throw new Error(`Cannot check out: Visitor is currently marked as ${visitor.visitState}.`);
    }

    visitor.visitState = 'EXITED';
    visitor.checkedOutAt = new Date();
    visitor.gateOut = gateNumber;
  }

  const savedVisitor = await visitor.save();

  // Create successful GateLog
  const gateLog = await GateLog.create({
    visitorId: savedVisitor._id,
    action: determinedAction,
    qrTokenVerified: true,
    scannedBy,
    geoLocation,
    ipAddress: req ? req.ip : undefined,
    userAgent: req && req.headers ? req.headers['user-agent'] : undefined
  });

  // Audit log
  await logAudit({
    entityType: 'GATE_LOG',
    entityId: gateLog._id,
    action: determinedAction,
    req,
    userId: scannedBy,
    details: {
      visitorId: savedVisitor.visitorId,
      fullName: savedVisitor.fullName,
      action: determinedAction,
      gate: gateNumber
    }
  });

  // Real-time WebSocket emission
  if (io) {
    io.emit('gate:event', {
      type: determinedAction,
      visitor: {
        _id: savedVisitor._id,
        visitorId: savedVisitor.visitorId,
        fullName: savedVisitor.fullName,
        visitState: savedVisitor.visitState,
        department: savedVisitor.departmentId?.name,
        timestamp: determinedAction === 'CHECK_IN' ? savedVisitor.checkedInAt : savedVisitor.checkedOutAt,
        gate: gateNumber
      }
    });

    io.emit('kpi:update');
  }

  return {
    success: true,
    action: determinedAction,
    visitor: savedVisitor,
    gateLog
  };
};

module.exports = {
  processGateScan
};
