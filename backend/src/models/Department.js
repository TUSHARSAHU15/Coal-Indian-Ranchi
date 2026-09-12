const mongoose = require('mongoose');

const departmentSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: [true, 'Department code is required'],
      unique: true,
      trim: true,
      uppercase: true
    },
    name: {
      type: String,
      required: [true, 'Department name is required'],
      trim: true
    },
    location: {
      type: String,
      required: [true, 'Department location is required'],
      trim: true
    },
    type: {
      type: String,
      required: [true, 'Department type is required'],
      enum: {
        values: ['HEADQUARTERS', 'MINE', 'WORKSHOP', 'REGIONAL'],
        message: '{VALUE} is not a valid department type'
      }
    },
    contactNumber: {
      type: String,
      trim: true
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Department', departmentSchema);
