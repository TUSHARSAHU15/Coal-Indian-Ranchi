const bcrypt = require('bcryptjs');
const User = require('../models/User');

/**
 * Create a new User
 * @route POST /api/v1/users
 */
const createUser = async (req, res, next) => {
  try {
    const {
      employeeId,
      role,
      departmentId,
      password,
      mfaEnabled,
      mfaSecret
    } = req.body;

    if (!employeeId || !role || !password) {
      return res.status(400).json({
        success: false,
        message: 'employeeId, role, and password are required fields'
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({
      employeeId,
      role,
      departmentId,
      password: hashedPassword,
      mfaEnabled: mfaEnabled || false,
      mfaSecret
    });

    const savedUser = await user.save();
    const userObj = savedUser.toObject();
    delete userObj.password;

    return res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: userObj
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'A user with this employeeId already exists'
      });
    }
    next(error);
  }
};

/**
 * Get all active users (e.g. for host selection)
 * @route GET /api/v1/users
 */
const getUsers = async (req, res, next) => {
  try {
    const { role, departmentId } = req.query;
    const filter = { isDeleted: false };

    if (role) filter.role = role;
    if (departmentId) filter.departmentId = departmentId;

    const users = await User.find(filter)
      .select('-password -mfaSecret')
      .populate('departmentId', 'name code location')
      .sort({ employeeId: 1 });

    return res.status(200).json({
      success: true,
      count: users.length,
      data: users
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createUser,
  getUsers
};
