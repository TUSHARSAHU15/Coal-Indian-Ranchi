const mongoose = require('mongoose');

const gateLogSchema = new mongoose.Schema(
  {
    visitorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Visitor',
      required: [true, 'Visitor reference is required'],
      index: true
    },
    action: {
      type: String,
      required: [true, 'Action is required'],
      enum: {
        values: ['CHECK_IN', 'CHECK_OUT'],
        message: '{VALUE} is not a valid gate action'
      }
    },
    qrTokenVerified: {
      type: Boolean,
      default: false
    },
    rejectionReason: {
      type: String,
      enum: {
        values: ['EXPIRED', 'INVALID_TOKEN', 'ALREADY_EXITED', 'DUPLICATE_SCAN', 'NOT_APPROVED'],
        message: '{VALUE} is not a valid rejection reason'
      },
      index: true
    },
    scannedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Scanning security officer/user is required'],
      index: true
    },
    ipAddress: {
      type: String,
      trim: true
    },
    userAgent: {
      type: String,
      trim: true
    },
    geoLocation: {
      type: {
        type: String,
        enum: ['Point']
      },
      coordinates: {
        type: [Number]
      }
    }
  },
  {
    timestamps: true
  }
);

// Indexes
gateLogSchema.index({ createdAt: -1 });
gateLogSchema.index({ geoLocation: '2dsphere' }, { sparse: true });

module.exports = mongoose.model('GateLog', gateLogSchema);
