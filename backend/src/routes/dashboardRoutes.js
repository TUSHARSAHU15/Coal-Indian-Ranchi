const express = require('express');
const {
  getKPIs,
  getTrafficTrends,
  getEmergencyRollCall
} = require('../controllers/DashboardController');
const { protect, authorize } = require('../middlewares/authMiddleware');

const router = express.Router();

router.get('/kpi', protect, authorize('SUPER_ADMIN', 'ADMIN'), getKPIs);
router.get('/traffic', protect, authorize('SUPER_ADMIN', 'ADMIN'), getTrafficTrends);
router.get('/emergency/rollcall', protect, authorize('SUPER_ADMIN', 'ADMIN', 'SECURITY'), getEmergencyRollCall);

module.exports = router;
