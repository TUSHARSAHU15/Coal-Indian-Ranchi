const express = require('express');
const { scanPass, getGateStatus } = require('../controllers/GateController');
const { protect, authorize } = require('../middlewares/authMiddleware');
const { gateLimiter } = require('../middlewares/rateLimiter');

const router = express.Router();

router.post('/scan', gateLimiter, protect, authorize('SECURITY', 'ADMIN', 'SUPER_ADMIN'), scanPass);
router.get('/status', protect, getGateStatus);

module.exports = router;
