const rateLimit = require('express-rate-limit');
const ApiError = require('../utils/ApiError');

/**
 * Limits login/register attempts per IP to slow down password-guessing.
 * Responds through the normal error handler so the JSON shape stays consistent.
 */
function createAuthRateLimiter({ windowMs, max }) {
  return rateLimit({
    windowMs,
    limit: max,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res, next) =>
      next(ApiError.tooManyRequests('Too many authentication attempts, please try again later')),
  });
}

module.exports = createAuthRateLimiter;
