const Visitor = require('../models/Visitor');
const visitorService = require('../services/visitorService');
const { decryptPII } = require('../utils/cryptoUtils');

/**
 * Register a new visitor
 * @route POST /api/v1/visitors
 */
const createVisitor = async (req, res, next) => {
  try {
    const {
      fullName,
      mobile,
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

    const cleanMobile = String(mobile || '').replace(/\D/g, '');
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

    const qrDataUri = await visitorService.generatePassQR(visitor);

    return res.status(200).json({
      success: true,
      data: {
        visitor,
        qrDataUri,
        passCode: visitor.passCode,
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

    const qrDataUri = await visitorService.generatePassQR(visitor);

    return res.status(200).json({
      success: true,
      data: {
        visitor: {
          _id: visitor._id,
          visitorId: visitor.visitorId,
          fullName: visitor.fullName,
          status: visitor.status,
          visitState: visitor.visitState,
          visitDate: visitor.visitDate,
          department: visitor.departmentId?.name,
          host: visitor.hostEmployeeId?.employeeId,
          passCode: visitor.passCode,
          expiresAt: visitor.expiresAt
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
  getAllVisitors,
  getVisitorById,
  approveVisitor,
  getVisitorPass,
  lookupVisitor,
  exportReport
};
