const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { verifyTOTP } = require('../utils/cryptoUtils');

const JWT_SECRET = process.env.JWT_SECRET || 'ccl_dvms_enterprise_jwt_super_secret_key_2026_x';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'ccl_dvms_enterprise_refresh_token_secret_key_2026_y';

// 15 minutes access token
const generateAccessToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
      employeeId: user.employeeId,
      role: user.role
    },
    JWT_SECRET,
    { expiresIn: '15m' }
  );
};

// 7 days refresh token
const generateRefreshToken = (user) => {
  return jwt.sign(
    { id: user._id },
    JWT_REFRESH_SECRET,
    { expiresIn: '7d' }
  );
};

/**
 * Authenticate user with password and account lockout logic
 */
const loginUser = async ({ employeeId, password }) => {
  const user = await User.findOne({ employeeId: employeeId.trim().toUpperCase() });
  if (!user || user.isDeleted) {
    throw new Error('Invalid Employee ID or credentials.');
  }

  // Check lockout
  if (user.lockoutUntil && user.lockoutUntil > new Date()) {
    const minutesLeft = Math.ceil((user.lockoutUntil - new Date()) / (60 * 1000));
    throw new Error(`Account locked due to consecutive failed attempts. Try again in ${minutesLeft} minute(s).`);
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    user.loginAttempts = (user.loginAttempts || 0) + 1;
    if (user.loginAttempts >= 5) {
      user.lockoutUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 min lockout
    }
    await user.save();
    throw new Error('Invalid Employee ID or credentials.');
  }

  // Reset failed attempts on success
  user.loginAttempts = 0;
  user.lockoutUntil = null;
  user.lastLoginAt = new Date();
  await user.save();

  // If MFA is enabled, return challenge
  if (user.mfaEnabled && user.mfaSecret) {
    const tempToken = jwt.sign(
      { id: user._id, mfaPending: true },
      JWT_SECRET,
      { expiresIn: '5m' }
    );
    return {
      mfaRequired: true,
      tempToken,
      user: {
        id: user._id,
        employeeId: user.employeeId,
        role: user.role
      }
    };
  }

  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);

  return {
    mfaRequired: false,
    accessToken,
    refreshToken,
    user: {
      id: user._id,
      employeeId: user.employeeId,
      role: user.role
    }
  };
};

/**
 * Verify 6-digit TOTP MFA code
 */
const verifyMFAChallenge = async ({ tempToken, code }) => {
  let decoded;
  try {
    decoded = jwt.verify(tempToken, JWT_SECRET);
  } catch (err) {
    throw new Error('MFA verification session expired. Please log in again.');
  }

  if (!decoded.mfaPending) {
    throw new Error('Invalid MFA session token.');
  }

  const user = await User.findById(decoded.id);
  if (!user || user.isDeleted) {
    throw new Error('User not found.');
  }

  const isValid = verifyTOTP(code, user.mfaSecret);
  if (!isValid) {
    throw new Error('Invalid 6-digit MFA code. Please check your authenticator app.');
  }

  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);

  return {
    accessToken,
    refreshToken,
    user: {
      id: user._id,
      employeeId: user.employeeId,
      role: user.role
    }
  };
};

/**
 * Renew access token with refresh token
 */
const refreshAccessToken = async (refreshToken) => {
  if (!refreshToken) {
    throw new Error('Refresh token is required.');
  }

  let decoded;
  try {
    decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET);
  } catch (err) {
    throw new Error('Invalid or expired refresh token. Please log in again.');
  }

  const user = await User.findById(decoded.id);
  if (!user || user.isDeleted) {
    throw new Error('User no longer exists.');
  }

  const newAccessToken = generateAccessToken(user);
  return {
    accessToken: newAccessToken,
    user: {
      id: user._id,
      employeeId: user.employeeId,
      role: user.role
    }
  };
};

module.exports = {
  loginUser,
  verifyMFAChallenge,
  refreshAccessToken
};
