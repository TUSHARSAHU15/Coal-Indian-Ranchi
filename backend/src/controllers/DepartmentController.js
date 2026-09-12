const Department = require('../models/Department');

/**
 * Create a new Department
 * @route POST /api/v1/departments
 */
const createDepartment = async (req, res, next) => {
  try {
    const { code, name, location, type, contactNumber, isActive } = req.body;

    if (!code || !name || !location || !type) {
      return res.status(400).json({
        success: false,
        message: 'code, name, location, and type are required fields'
      });
    }

    const department = new Department({
      code,
      name,
      location,
      type,
      contactNumber,
      isActive
    });

    const savedDepartment = await department.save();

    return res.status(201).json({
      success: true,
      message: 'Department created successfully',
      data: savedDepartment
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'A department with this code already exists'
      });
    }
    next(error);
  }
};

/**
 * Get all active departments
 * @route GET /api/v1/departments
 */
const getDepartments = async (req, res, next) => {
  try {
    const departments = await Department.find({ isActive: true }).sort({ name: 1 });
    return res.status(200).json({
      success: true,
      count: departments.length,
      data: departments
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createDepartment,
  getDepartments
};
