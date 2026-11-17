const ApiError = require('../utils/ApiError');

/** Catch-all for URLs that match no route -> 404 JSON. */
function notFound(req, res, next) {
  next(ApiError.notFound(`Route ${req.method} ${req.originalUrl} not found`));
}

module.exports = notFound;
