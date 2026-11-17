/**
 * ApiError - an Error that carries an HTTP status code.
 *
 * Controllers/validators throw it; the central error-handling middleware
 * turns it into a consistent JSON response:
 *   { "success": false, "error": { "status": 400, "message": "...", "details": [...] } }
 */
class ApiError extends Error {
  constructor(statusCode, message, details) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.details = details;
  }

  static badRequest(message, details) {
    return new ApiError(400, message, details);
  }

  static unauthorized(message = 'Authentication required') {
    return new ApiError(401, message);
  }

  static notFound(message = 'Resource not found') {
    return new ApiError(404, message);
  }

  static conflict(message) {
    return new ApiError(409, message);
  }

  static tooManyRequests(message = 'Too many requests, please try again later') {
    return new ApiError(429, message);
  }
}

module.exports = ApiError;
