const mongoose = require('mongoose');

const visitorSchema = new mongoose.Schema(
  {
    // Identity
    visitorId: {
      type: String,
      required: [true, 'Visitor ID is required'],
      unique: true,
      trim: true,
      immutable: true
    },
    fullName: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true
    },
    mobile: {
      type: String,
      required: [true, 'Mobile number is required'],
      trim: true
    },
    email: {
      type: String,
      trim: true,
      lowercase: true
    },

    // Government ID
    govtIdType: {
      type: String,
      trim: true
    },
    govtIdNumber: {
      type: String,
      trim: true
    },
    govtIdHash: {
      type: String,
      index: true
    },
    photoUrl: {
      type: String,
      trim: true
    },

    // Visit details
    hostEmployeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Host employee ID is required'],
      index: true
    },
    departmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
      required: [true, 'Department ID is required']
    },
    purpose: {
      type: String,
      required: [true, 'Purpose of visit is required'],
      trim: true
    },
    visitDate: {
      type: Date,
      required: [true, 'Visit date is required'],
      index: true
    },
    expectedDuration: {
      type: Number,
      required: [true, 'Expected duration is required']
    },

    // Access
    qrTokenHash: {
      type: String
    },
    passCode: {
      type: String
    },
    expiresAt: {
      type: Date
    },

    // Status
    status: {
      type: String,
      required: [true, 'Status is required'],
      enum: {
        values: ['PENDING', 'APPROVED', 'REJECTED', 'EXPIRED', 'CANCELLED'],
        message: '{VALUE} is not a valid status'
      },
      index: true
    },
    visitState: {
      type: String,
      required: [true, 'Visit state is required'],
      enum: {
        values: ['NOT_ARRIVED', 'INSIDE', 'EXITED', 'OVERSTAYED'],
        message: '{VALUE} is not a valid visit state'
      },
      index: true
    },

    // Tracking
    checkedInAt: {
      type: Date
    },
    checkedOutAt: {
      type: Date
    },
    approvedAt: {
      type: Date
    },
    gateIn: {
      type: String,
      trim: true
    },
    gateOut: {
      type: String,
      trim: true
    }
  },
  {
    timestamps: true
  }
);

// Compound index for efficient daily dashboard and gate lookups
visitorSchema.index({ visitDate: 1, status: 1, visitState: 1 });

module.exports = mongoose.model('Visitor', visitorSchema);
