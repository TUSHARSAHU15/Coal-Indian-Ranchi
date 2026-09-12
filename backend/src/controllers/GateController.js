const gateService = require('../services/gateService');
const GateLog = require('../models/GateLog');
const Visitor = require('../models/Visitor');

/**
 * Scan pass (QR / passcode) for Check-in / Check-out
 * @route POST /api/v1/gate/scan
 */
const scanPass = async (req, res, next) => {
  try {
    const { identifier, action, gateNumber, geoLocation, rawQrToken } = req.body;

    if (!identifier) {
      return res.status(400).json({
        success: false,
        message: 'Pass identifier (QR payload, passcode, or visitor ID) is required.'
      });
    }

    const scannedBy = req.user ? req.user._id : req.body.scannedBy;
    if (!scannedBy) {
      return res.status(400).json({
        success: false,
        message: 'Security officer ID (scannedBy) is required.'
      });
    }

    const result = await gateService.processGateScan({
      identifier,
      rawQrToken,
      action,
      scannedBy,
      gateNumber,
      geoLocation,
      io: req.io,
      req
    });

    return res.status(200).json({
      success: true,
      message: `Visitor successfully ${result.action === 'CHECK_IN' ? 'checked in' : 'checked out'}.`,
      data: result
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Get active gate status & recent activity
 * @route GET /api/v1/gate/status
 */
const getGateStatus = async (req, res, next) => {
  try {
    const insideCount = await Visitor.countDocuments({ visitState: 'INSIDE' });
    const recentScans = await GateLog.find()
      .populate('visitorId', 'fullName visitorId mobile')
      .populate('scannedBy', 'employeeId')
      .sort({ createdAt: -1 })
      .limit(10);

    return res.status(200).json({
      success: true,
      data: {
        currentlyInside: insideCount,
        recentScans
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  scanPass,
  getGateStatus
};
