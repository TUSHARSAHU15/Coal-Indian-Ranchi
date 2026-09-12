const express = require('express');
const { createDepartment, getDepartments } = require('../controllers/DepartmentController');

const router = express.Router();

router.get('/', getDepartments);
router.post('/', createDepartment);

module.exports = router;
