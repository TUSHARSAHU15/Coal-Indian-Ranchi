const express = require('express');
const {
  getKPIs,
  getTrafficTrends,
  getEmergencyRollCall
} = require('../controllers/DashboardController');
const { protect } = require('../middlewares/authMiddleware');

const router = express.Router();

router.get('/kpi', getKPIs);
router.get('/traffic', getTrafficTrends);
router.get('/emergency/rollcall', getEmergencyRollCall);

module.exports = router;
