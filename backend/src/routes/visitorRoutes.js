const express = require('express');
const {
  createVisitor,
  sendMobileOtp,
  verifyMobileOtp,
  getAllVisitors,
  getVisitorById,
  approveVisitor,
  getVisitorPass,
  lookupVisitor,
  exportReport
} = require('../controllers/VisitorController');
const { protect, authorize } = require('../middlewares/authMiddleware');

const router = express.Router();

// Public visitor self-service OTP, registration, lookup and pass generation
router.post('/otp/send', sendMobileOtp);
router.post('/otp/verify', verifyMobileOtp);
router.get('/lookup', lookupVisitor);
router.get('/:id/pass', getVisitorPass);
router.post('/', createVisitor);
router.get('/', protect, getAllVisitors);
router.get('/reports/export', protect, authorize('SUPER_ADMIN', 'ADMIN'), exportReport);
router.get('/export-csv', exportReport);
router.get('/:id', protect, getVisitorById);
router.patch('/:id/approve', protect, authorize('EMPLOYEE'), approveVisitor);

module.exports = router;
