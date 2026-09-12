const express = require('express');
const { createGateLog } = require('../controllers/GateLogController');

const router = express.Router();

// POST / (calls createGateLog)
router.post('/', createGateLog);

module.exports = router;
