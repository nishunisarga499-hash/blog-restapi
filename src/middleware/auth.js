/**
 * JWT authentication middleware.
 *
 *  authenticate   - requires "Authorization: Bearer <token>", verifies it and
 *                   attaches the user to req.user
 *  protectWrites  - what the /posts write routes use: it is `authenticate` when
 *                   AUTH_REQUIRED=true and a no-op otherwise (so the base CRUD API
 *                   works out of the box, and can be locked down with one setting)
 */
const jwt = require('jsonwebtoken');
const ApiError = require('../utils/ApiError');
const publicUser = require('../utils/publicUser');

function createAuthMiddleware({ config, usersRepo }) {
  async function authenticate(req, res, next) {
    const header = req.headers.authorization || '';
    const [scheme, token] = header.split(' ');

    if (!/^Bearer$/i.test(scheme || '') || !token) {
      throw ApiError.unauthorized('Authentication required. Send the header "Authorization: Bearer <token>"');
    }

    let payload;
    try {
      payload = jwt.verify(token, config.jwtSecret, { algorithms: ['HS256'] });
    } catch (err) {
      throw ApiError.unauthorized(
        err.name === 'TokenExpiredError' ? 'Token has expired. Please log in again.' : 'Invalid token'
      );
    }

    const user = usersRepo.isValidId(payload.sub) ? await usersRepo.findById(payload.sub) : null;
    if (!user) {
      throw ApiError.unauthorized('The user for this token no longer exists');
    }

    req.user = publicUser(user);
    next();
  }

  const protectWrites = config.authRequired ? authenticate : (req, res, next) => next();

  return { authenticate, protectWrites };
}

module.exports = createAuthMiddleware;
