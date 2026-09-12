const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    employeeId: {
      type: String,
      required: [true, 'Employee ID is required'],
      unique: true,
      trim: true,
      uppercase: true
    },
    role: {
      type: String,
      required: [true, 'Role is required'],
      enum: {
        values: ['SUPER_ADMIN', 'ADMIN', 'SECURITY', 'EMPLOYEE'],
        message: '{VALUE} is not a valid user role'
      }
    },
    departmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department'
    },
    password: {
      type: String,
      required: [true, 'Password is required']
    },
    mfaEnabled: {
      type: Boolean,
      default: false
    },
    mfaSecret: {
      type: String
    },
    lastLoginAt: {
      type: Date
    },
    loginAttempts: {
      type: Number,
      default: 0
    },
    lockoutUntil: {
      type: Date
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true
    }
  },
  {
    timestamps: true
  }
);

// Compound index for active user queries by employeeId
userSchema.index({ employeeId: 1, isDeleted: 1 });

module.exports = mongoose.model('User', userSchema);
