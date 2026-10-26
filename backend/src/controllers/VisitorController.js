const Visitor = require('../models/Visitor');
const visitorService = require('../services/visitorService');
const smsService = require('../services/smsService');
const { decryptPII } = require('../utils/cryptoUtils');

const mobileOtpStore = new Map();
const verifiedMobiles = new Set();

/**
 * Send mobile verification OTP for self-registration
 * @route POST /api/v1/visitors/otp/send
 */
const sendMobileOtp = async (req, res) => {
  try {
    const { mobile } = req.body;
    const cleanMobile = String(mobile || '').replace(/\D/g, '').slice(-10);
    if (!cleanMobile || cleanMobile.length !== 10) {
      return res.status(400).json({
        success: false,
        message: 'Valid 10-digit mobile number required.'
      });
    }

    const otp = String(Math.floor(100000 + Math.random() * 900000));
    mobileOtpStore.set(cleanMobile, {
      otp,
      expiresAt: Date.now() + 15 * 60 * 1000 // 15 mins
    });

    const smsResult = await smsService.sendOtpSms(cleanMobile, otp);
    const isLiveDelivered = smsResult.delivered;

    return res.status(200).json({
      success: true,
      message: isLiveDelivered
        ? `Live SMS sent successfully to +91-${cleanMobile}`
        : `Verification code generated for +91-${cleanMobile}`,
      delivered: isLiveDelivered,
      provider: smsResult.provider,
      carrierNotice: smsResult.carrierNotice || null,
      devOtp: isLiveDelivered ? undefined : otp
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Verify mobile OTP
 * @route POST /api/v1/visitors/otp/verify
 */
const verifyMobileOtp = async (req, res) => {
  try {
    const { mobile, otp } = req.body;
    const cleanMobile = String(mobile || '').replace(/\D/g, '').slice(-10);
    const record = mobileOtpStore.get(cleanMobile);

    if (!record) {
      return res.status(400).json({
        success: false,
        message: 'No active OTP found for this mobile number. Please click Send OTP.'
      });
    }

    if (Date.now() > record.expiresAt) {
      mobileOtpStore.delete(cleanMobile);
      return res.status(400).json({
        success: false,
        message: 'Verification code has expired. Please request a new OTP.'
      });
    }

    const enteredOtp = String(otp || '').trim();
    const allowDevBypass = process.env.ENABLE_DEV_OTP_BYPASS === 'true';

    if (record.otp === enteredOtp || (allowDevBypass && enteredOtp === '123456')) {
      verifiedMobiles.add(cleanMobile);
      mobileOtpStore.delete(cleanMobile);
      return res.status(200).json({
        success: true,
        message: 'Mobile number verified successfully.',
        verified: true
      });
    }

    return res.status(400).json({
      success: false,
      message: 'Invalid verification code. Please check your SMS and enter the 6-digit OTP.'
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Register a new visitor
 * @route POST /api/v1/visitors
 */
const createVisitor = async (req, res, next) => {
  try {
    const {
      fullName,
      mobile,
      email,
      companyName,
      visitTime,
      govtIdType,
      govtIdNumber,
      hostEmployeeId,
      departmentId,
      purpose,
      visitDate
    } = req.body;

    if (!fullName || !String(fullName).trim()) {
      return res.status(400).json({
        success: false,
        message: 'Full name is required.'
      });
    }

    const cleanMobile = String(mobile || '').replace(/\D/g, '').slice(-10);
    if (!cleanMobile || cleanMobile.length !== 10) {
      return res.status(400).json({
        success: false,
        message: 'Valid 10-digit mobile number is required.'
      });
    }

    if (!govtIdNumber || !String(govtIdNumber).trim()) {
      return res.status(400).json({
        success: false,
        message: `${govtIdType || 'Government ID'} number is required.`
      });
    }

    const cleanId = String(govtIdNumber).trim();
    if (govtIdType === 'Aadhaar Card' && !/^\d{12}$/.test(cleanId)) {
      return res.status(400).json({
        success: false,
        message: 'Aadhaar Card number must be exactly 12 numeric digits.'
      });
    }

    if (govtIdType === 'PAN Card' && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(cleanId.toUpperCase())) {
      return res.status(400).json({
        success: false,
        message: 'PAN Card must be exactly 10 characters in ABCDE1234F format.'
      });
    }

    if (govtIdType === 'Voter ID' && !/^[A-Z0-9]{10}$/.test(cleanId.toUpperCase())) {
      return res.status(400).json({
        success: false,
        message: 'Voter ID must be exactly 10 alphanumeric characters.'
      });
    }

    if (govtIdType === 'Driving License' && (cleanId.length < 10 || cleanId.length > 16)) {
      return res.status(400).json({
        success: false,
        message: 'Driving License number must be between 10 and 16 characters.'
      });
    }

    if (!hostEmployeeId) {
      return res.status(400).json({
        success: false,
        message: 'Host employee selection is required.'
      });
    }

    if (!departmentId) {
      return res.status(400).json({
        success: false,
        message: 'Department selection is required.'
      });
    }

    if (!purpose || !String(purpose).trim()) {
      return res.status(400).json({
        success: false,
        message: 'Purpose of visit is required.'
      });
    }

    const createdVisitor = await visitorService.registerVisitor(req.body, req);

    if (req.io) {
      req.io.emit('kpi:update');
      req.io.emit('gate:event', { type: 'NEW_VISITOR', visitor: createdVisitor });
    }

    return res.status(201).json({
      success: true,
      message: 'Visitor registered successfully.',
      data: createdVisitor
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'A visitor with this record already exists.'
      });
    }
    next(error);
  }
};

/**
 * Get all visitors with optional filters
 * @route GET /api/v1/visitors
 */
const getAllVisitors = async (req, res, next) => {
  try {
    const { status, visitState, departmentId, hostEmployeeId, search, date } = req.query;
    const filter = {};

    if (status) filter.status = status;
    if (visitState) filter.visitState = visitState;
    if (departmentId) filter.departmentId = departmentId;
    if (hostEmployeeId) filter.hostEmployeeId = hostEmployeeId;

    if (date) {
      const start = new Date(date);
      start.setHours(0, 0, 0, 0);
      const end = new Date(date);
      end.setHours(23, 59, 59, 999);
      filter.visitDate = { $gte: start, $lte: end };
    }

    if (search) {
      filter.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { mobile: { $regex: search, $options: 'i' } },
        { visitorId: { $regex: search, $options: 'i' } },
        { passCode: { $regex: search, $options: 'i' } }
      ];
    }

    const visitors = await Visitor.find(filter)
      .populate('departmentId', 'name code location')
      .populate('hostEmployeeId', 'employeeId role')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: visitors.length,
      data: visitors
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get single visitor details with decrypted PII for authorized roles
 * @route GET /api/v1/visitors/:id
 */
const getVisitorById = async (req, res, next) => {
  try {
    const visitor = await Visitor.findById(req.params.id)
      .populate('departmentId', 'name code location')
      .populate('hostEmployeeId', 'employeeId role');

    if (!visitor) {
      return res.status(404).json({
        success: false,
        message: 'Visitor not found.'
      });
    }

    const visitorObj = visitor.toObject();

    // Decrypt Govt ID if user is authorized
    if (['SUPER_ADMIN', 'ADMIN', 'SECURITY'].includes(req.user?.role)) {
      if (visitorObj.govtIdNumber) {
        visitorObj.decryptedGovtId = decryptPII(visitorObj.govtIdNumber);
      }
    } else {
      delete visitorObj.govtIdNumber;
      delete visitorObj.govtIdHash;
    }

    return res.status(200).json({
      success: true,
      data: visitorObj
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Approve or Reject a visitor request
 * @route PATCH /api/v1/visitors/:id/approve
 */
const approveVisitor = async (req, res, next) => {
  try {
    if (['SUPER_ADMIN', 'ADMIN'].includes(req.user?.role)) {
      return res.status(403).json({
        success: false,
        message: 'Admins do not have approval access. Approvals must be made by the designated Host employee.'
      });
    }

    if (req.user?.role !== 'EMPLOYEE') {
      return res.status(403).json({
        success: false,
        message: 'Only Host employees can approve or reject visitor requests.'
      });
    }

    const { status, remarks } = req.body;
    if (!status || !['APPROVED', 'REJECTED'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Status must be either 'APPROVED' or 'REJECTED'."
      });
    }

    const updatedVisitor = await visitorService.processApproval(
      req.params.id,
      { status, remarks },
      req
    );

    if (req.io) {
      req.io.emit('kpi:update');
      req.io.emit('gate:event', { type: 'APPROVAL_UPDATE', visitor: updatedVisitor });
    }

    return res.status(200).json({
      success: true,
      message: `Visitor request has been ${status.toLowerCase()}.`,
      data: updatedVisitor
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Generate/Retrieve digital pass with SVG QR code
 * @route GET /api/v1/visitors/:id/pass
 */
const getVisitorPass = async (req, res, next) => {
  try {
    const visitor = await Visitor.findById(req.params.id)
      .populate('departmentId', 'name code location')
      .populate('hostEmployeeId', 'employeeId role');

    if (!visitor) {
      return res.status(404).json({
        success: false,
        message: 'Visitor not found.'
      });
    }

    let qrDataUri = null;
    if (visitor.status === 'APPROVED') {
      qrDataUri = await visitorService.generatePassQR(visitor);
    }

    return res.status(200).json({
      success: true,
      data: {
        visitor,
        qrDataUri,
        passCode: visitor.status === 'APPROVED' ? visitor.passCode : undefined,
        isEntryPermitted: visitor.status === 'APPROVED',
        expiresAt: visitor.expiresAt
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Public self-service lookup (by mobile or visitorId)
 * @route GET /api/v1/visitors/lookup
 */
const lookupVisitor = async (req, res, next) => {
  try {
    const { query } = req.query;
    if (!query) {
      return res.status(400).json({
        success: false,
        message: 'Query parameter (mobile or visitor ID) is required.'
      });
    }

    const visitor = await Visitor.findOne({
      $or: [
        { visitorId: query.trim().toUpperCase() },
        { mobile: query.trim() },
        { passCode: query.trim() }
      ]
    })
      .populate('departmentId', 'name code location')
      .populate('hostEmployeeId', 'employeeId role')
      .sort({ createdAt: -1 });

    if (!visitor) {
      return res.status(404).json({
        success: false,
        message: 'No visitor record found for the provided details.'
      });
    }

    let qrDataUri = null;
    if (visitor.status === 'APPROVED') {
      qrDataUri = await visitorService.generatePassQR(visitor);
    }

    return res.status(200).json({
      success: true,
      data: {
        visitor: {
          _id: visitor._id,
          visitorId: visitor.visitorId,
          fullName: visitor.fullName,
          mobile: visitor.mobile,
          email: visitor.email,
          companyName: visitor.companyName,
          purpose: visitor.purpose,
          status: visitor.status,
          visitState: visitor.visitState,
          visitDate: visitor.visitDate,
          visitTime: visitor.visitTime,
          department: visitor.departmentId?.name,
          host: visitor.hostEmployeeId?.employeeId,
          passCode: visitor.status === 'APPROVED' ? visitor.passCode : undefined,
          expiresAt: visitor.expiresAt,
          isEntryPermitted: visitor.status === 'APPROVED'
        },
        qrDataUri
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Export visitor report as CSV
 * @route GET /api/v1/reports/export
 */
const exportReport = async (req, res, next) => {
  try {
    const visitors = await Visitor.find()
      .populate('departmentId', 'name code')
      .populate('hostEmployeeId', 'employeeId')
      .sort({ createdAt: -1 });

    const headers = [
      'Visitor ID',
      'Full Name',
      'Mobile',
      'Department',
      'Host Employee',
      'Purpose',
      'Status',
      'Visit State',
      'Check-In Time',
      'Check-Out Time',
      'Visit Date'
    ];

    const rows = visitors.map(v => [
      v.visitorId,
      `"${v.fullName.replace(/"/g, '""')}"`,
      v.mobile,
      `"${v.departmentId?.name || ''}"`,
      v.hostEmployeeId?.employeeId || '',
      `"${(v.purpose || '').replace(/"/g, '""')}"`,
      v.status,
      v.visitState,
      v.checkedInAt ? v.checkedInAt.toISOString() : '',
      v.checkedOutAt ? v.checkedOutAt.toISOString() : '',
      v.visitDate ? v.visitDate.toISOString() : ''
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=CCL_DVMS_Visitors_${Date.now()}.csv`);
    return res.status(200).send(csvContent);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createVisitor,
  sendMobileOtp,
  verifyMobileOtp,
  getAllVisitors,
  getVisitorById,
  approveVisitor,
  getVisitorPass,
  lookupVisitor,
  exportReport
};
