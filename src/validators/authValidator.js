/**
 * Validation for /auth request bodies.
 */
const ApiError = require('../utils/ApiError');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_RE = /^[A-Za-z0-9_]+$/;

function assertObject(body) {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    throw ApiError.badRequest('Request body must be a JSON object');
  }
}

function readEmail(body, errors) {
  if (typeof body.email !== 'string' || body.email.trim() === '') {
    errors.push({ field: 'email', message: 'email is required' });
    return undefined;
  }
  const email = body.email.trim().toLowerCase();
  if (email.length > 254 || !EMAIL_RE.test(email)) {
    errors.push({ field: 'email', message: 'email must be a valid email address' });
    return undefined;
  }
  return email;
}

function validateRegister(body) {
  assertObject(body);
  const errors = [];

  let username;
  if (typeof body.username !== 'string' || body.username.trim() === '') {
    errors.push({ field: 'username', message: 'username is required' });
  } else {
    username = body.username.trim();
    if (username.length < 3 || username.length > 30) {
      errors.push({ field: 'username', message: 'username must be 3-30 characters long' });
    } else if (!USERNAME_RE.test(username)) {
      errors.push({ field: 'username', message: 'username may contain only letters, numbers and underscores' });
    }
  }

  const email = readEmail(body, errors);

  const { password } = body;
  if (typeof password !== 'string' || password === '') {
    errors.push({ field: 'password', message: 'password is required' });
  } else if (password.length < 8) {
    errors.push({ field: 'password', message: 'password must be at least 8 characters long' });
  } else if (password.length > 72) {
    // bcrypt only uses the first 72 bytes, so longer passwords would be silently truncated.
    errors.push({ field: 'password', message: 'password must be at most 72 characters long' });
  }

  if (errors.length > 0) throw ApiError.badRequest('Validation failed', errors);
  return { username, email, password };
}

function validateLogin(body) {
  assertObject(body);
  const errors = [];

  const email = readEmail(body, errors);
  if (typeof body.password !== 'string' || body.password === '') {
    errors.push({ field: 'password', message: 'password is required' });
  }

  if (errors.length > 0) throw ApiError.badRequest('Validation failed', errors);
  return { email, password: body.password };
}

module.exports = { validateRegister, validateLogin };
