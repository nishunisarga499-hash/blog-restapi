/**
 * /auth routes: register, login and the current user.
 * Rate limited to slow down brute-force attempts.
 */
const express = require('express');
const createAuthController = require('../controllers/authController');
const createAuthRateLimiter = require('../middleware/rateLimiter');

function createAuthRoutes({ config, usersRepo, authenticate }) {
  const router = express.Router();
  const ctrl = createAuthController({ config, usersRepo });

  router.use(createAuthRateLimiter(config.authRateLimit));

  router.post('/register', ctrl.register);
  router.post('/login', ctrl.login);
  router.get('/me', authenticate, ctrl.me);

  return router;
}

module.exports = createAuthRoutes;
