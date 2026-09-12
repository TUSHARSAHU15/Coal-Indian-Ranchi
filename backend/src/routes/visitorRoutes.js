const express = require('express');
const {
  createVisitor,
  getAllVisitors,
  getVisitorById,
  approveVisitor,
  getVisitorPass,
  lookupVisitor,
  exportReport
} = require('../controllers/VisitorController');
const { protect, authorize } = require('../middlewares/authMiddleware');

const router = express.Router();

// Public self-service lookup and pass generation
router.get('/lookup', lookupVisitor);
router.get('/:id/pass', getVisitorPass);

// Protected routes
router.post('/', createVisitor);
router.get('/', protect, getAllVisitors);
router.get('/reports/export', protect, authorize('SUPER_ADMIN', 'ADMIN'), exportReport);
router.get('/export-csv', exportReport);
router.get('/:id', protect, getVisitorById);
router.patch('/:id/approve', protect, authorize('EMPLOYEE', 'ADMIN', 'SUPER_ADMIN'), approveVisitor);

module.exports = router;
