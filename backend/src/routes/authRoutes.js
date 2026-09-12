const express = require('express');
const {
  login,
  verifyMFA,
  refreshToken,
  logout,
  getMe
} = require('../controllers/AuthController');
const { protect } = require('../middlewares/authMiddleware');
const { authLimiter } = require('../middlewares/rateLimiter');

const router = express.Router();

router.post('/login', authLimiter, login);
router.post('/mfa/verify', authLimiter, verifyMFA);
router.post('/refresh', refreshToken);
router.post('/logout', logout);
router.get('/me', protect, getMe);

module.exports = router;
