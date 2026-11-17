/**
 * Central error-handling middleware. Every error in the app ends up here and is
 * converted to the same JSON shape:
 *
 *   { "success": false, "error": { "status": 404, "message": "...", "details": [...] } }
 *
 * Unexpected (5xx) errors are logged on the server but never leak internals to the client.
 */
const http = require('http');
const ApiError = require('../utils/ApiError');

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);

  let status = 500;
  let message = 'Internal server error';
  let details;

  if (err instanceof ApiError) {
    status = err.statusCode;
    message = err.message;
    details = err.details;
  } else if (err.type === 'entity.parse.failed') {
    status = 400;
    message = 'Malformed JSON in request body';
  } else if (err.type === 'entity.too.large') {
    status = 413;
    message = 'Request body is too large';
  } else if (Number.isInteger(err.status) && err.status >= 400 && err.status < 500) {
    // Other client errors raised by Express/body-parser (e.g. unsupported charset).
    status = err.status;
    message = http.STATUS_CODES[status] || 'Bad request';
  }

  if (status >= 500) {
    console.error('[error]', err);
  }

  const body = { success: false, error: { status, message } };
  if (details) body.error.details = details;
  res.status(status).json(body);
}

module.exports = errorHandler;
