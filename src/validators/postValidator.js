/**
 * Input validation for blog-post request bodies.
 *
 * Rules (trimmed length):
 *   title    3 - 150      content  10 - 20000
 *   author   2 - 100      category  2 - 50
 *
 * - On create all four fields are required.
 * - On update (PUT/PATCH) fields are optional, but at least one must be sent.
 * - Read-only fields (id, createdAt, updatedAt) are silently ignored so a client
 *   can safely send back an object it previously fetched.
 * - Any other unknown field is rejected with a clear message.
 */
const ApiError = require('../utils/ApiError');

const RULES = {
  title: { min: 3, max: 150 },
  content: { min: 10, max: 20000 },
  author: { min: 2, max: 100 },
  category: { min: 2, max: 50 },
};

const READ_ONLY_FIELDS = new Set(['id', '_id', 'createdAt', 'updatedAt', '__v']);
const ALLOWED_LIST = Object.keys(RULES).join(', ');

function validatePostPayload(body, { partial = false } = {}) {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    throw ApiError.badRequest('Request body must be a JSON object', [
      { field: 'body', message: `Send a JSON object with the fields: ${ALLOWED_LIST}` },
    ]);
  }

  const errors = [];
  const data = {};

  for (const key of Object.keys(body)) {
    if (!READ_ONLY_FIELDS.has(key) && !Object.hasOwn(RULES, key)) {
      errors.push({ field: key, message: `Unknown field "${key}". Allowed fields: ${ALLOWED_LIST}` });
    }
  }

  for (const [field, { min, max }] of Object.entries(RULES)) {
    if (!Object.hasOwn(body, field) || body[field] === undefined) {
      if (!partial) errors.push({ field, message: `${field} is required` });
      continue;
    }

    const value = body[field];
    if (typeof value !== 'string') {
      errors.push({ field, message: `${field} must be a string` });
      continue;
    }

    const trimmed = value.trim();
    if (trimmed.length === 0) {
      errors.push({ field, message: `${field} must not be empty` });
    } else if (trimmed.length < min) {
      errors.push({ field, message: `${field} must be at least ${min} characters long` });
    } else if (trimmed.length > max) {
      errors.push({ field, message: `${field} must be at most ${max} characters long` });
    } else {
      data[field] = trimmed;
    }
  }

  if (partial && errors.length === 0 && Object.keys(data).length === 0) {
    errors.push({
      field: 'body',
      message: `Provide at least one field to update: ${ALLOWED_LIST}`,
    });
  }

  if (errors.length > 0) {
    throw ApiError.badRequest('Validation failed', errors);
  }

  return data;
}

module.exports = { validatePostPayload, RULES };
