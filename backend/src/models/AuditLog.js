const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    entityType: {
      type: String,
      required: [true, 'Entity type is required'],
      enum: {
        values: ['VISITOR', 'USER', 'GATE_LOG'],
        message: '{VALUE} is not a valid entity type'
      }
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, 'Entity ID is required']
    },
    action: {
      type: String,
      required: [true, 'Action is required'],
      enum: {
        values: ['CREATE', 'UPDATE', 'DELETE', 'APPROVE', 'REJECT', 'CHECK_IN', 'CHECK_OUT'],
        message: '{VALUE} is not a valid action'
      }
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true
    },
    userEmployeeId: {
      type: String,
      trim: true
    },
    userRole: {
      type: String,
      trim: true
    },
    ipAddress: {
      type: String,
      trim: true
    },
    userAgent: {
      type: String,
      trim: true
    },
    sessionId: {
      type: String,
      trim: true
    },
    details: {
      type: mongoose.Schema.Types.Mixed
    }
  },
  {
    timestamps: true
  }
);

// Performance indexes for auditing and log queries
auditLogSchema.index({ entityType: 1, entityId: 1 });
auditLogSchema.index({ createdAt: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
