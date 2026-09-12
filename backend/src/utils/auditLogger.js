const AuditLog = require('../models/AuditLog');

/**
 * Append-only compliance audit logging helper
 */
const logAudit = async ({
  entityType,
  entityId,
  action,
  req,
  userId,
  userEmployeeId,
  userRole,
  details
}) => {
  try {
    const actorUser = req && req.user ? req.user : {};
    
    await AuditLog.create({
      entityType,
      entityId,
      action,
      userId: userId || actorUser._id || actorUser.id,
      userEmployeeId: userEmployeeId || actorUser.employeeId,
      userRole: userRole || actorUser.role,
      ipAddress: req ? (req.ip || req.headers['x-forwarded-for'] || req.socket?.remoteAddress) : undefined,
      userAgent: req && req.headers ? req.headers['user-agent'] : undefined,
      details
    });
  } catch (err) {
    // Non-blocking: log audit failures to stderr without failing parent business operations
    console.error('AuditLog writing failed:', err.message);
  }
};

module.exports = {
  logAudit
};
