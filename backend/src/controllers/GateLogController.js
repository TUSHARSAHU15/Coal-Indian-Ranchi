const GateLog = require('../models/GateLog');

/**
 * Create a new GateLog entry
 * @route POST /api/gatelogs (or invoked via gate routes)
 */
const createGateLog = async (req, res) => {
  try {
    const { visitorId, action } = req.body;

    // Validate required fields
    if (!visitorId || !action) {
      return res.status(400).json({
        success: false,
        message: 'visitorId and action are required fields'
      });
    }

    // Create new GateLog instance with request body and client metadata
    const gateLog = new GateLog({
      ...req.body,
      visitorId,
      action,
      ipAddress: req.ip || req.headers['x-forwarded-for'] || req.socket?.remoteAddress,
      userAgent: req.headers ? req.headers['user-agent'] : undefined
    });

    const savedGateLog = await gateLog.save();

    return res.status(201).json({
      success: true,
      data: savedGateLog
    });
  } catch (error) {
    // Handle Mongoose validation or casting errors as bad request (400)
    if (error.name === 'ValidationError' || error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    // Unexpected server errors (500)
    return res.status(500).json({
      success: false,
      message: error.message || 'An unexpected error occurred'
    });
  }
};

module.exports = {
  createGateLog
};
