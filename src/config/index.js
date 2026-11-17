/**
 * Central configuration. Everything comes from environment variables
 * (see .env.example) so the same code runs locally, in tests and on Render.
 *
 * loadConfig() is a function (not a constant) so tests can build an app with
 * custom settings without touching process.env.
 */
const crypto = require('crypto');
const path = require('path');

const STORAGE_DRIVERS = ['memory', 'file', 'mongo'];

function toBool(value, fallback = false) {
  if (value === undefined || value === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
}

function toInt(value, fallback) {
  const parsed = parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseOrigins(value) {
  if (!value || value.trim() === '*') return '*';
  return value
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

function loadConfig(env = process.env) {
  const nodeEnv = env.NODE_ENV || 'development';
  const isProduction = nodeEnv === 'production';

  const storageDriver = (env.STORAGE_DRIVER || 'file').toLowerCase();
  if (!STORAGE_DRIVERS.includes(storageDriver)) {
    throw new Error(
      `Invalid STORAGE_DRIVER "${env.STORAGE_DRIVER}". Use one of: ${STORAGE_DRIVERS.join(', ')}`
    );
  }
  if (storageDriver === 'mongo' && !env.MONGODB_URI) {
    throw new Error('STORAGE_DRIVER=mongo requires MONGODB_URI to be set');
  }

  let jwtSecret = env.JWT_SECRET;
  if (!jwtSecret) {
    if (isProduction) {
      throw new Error('JWT_SECRET must be set when NODE_ENV=production');
    }
    // Development convenience: a random secret (tokens become invalid on restart).
    jwtSecret = crypto.randomBytes(32).toString('hex');
    console.warn('[config] JWT_SECRET not set - using a temporary random secret for this run.');
  }

  return {
    env: nodeEnv,
    isProduction,
    port: toInt(env.PORT, 3000),
    storageDriver,
    dataDir: path.resolve(env.DATA_DIR || path.join(__dirname, '..', '..', 'data')),
    mongoUri: env.MONGODB_URI || '',
    jwtSecret,
    jwtExpiresIn: env.JWT_EXPIRES_IN || '1d',
    // When true, POST/PUT/PATCH/DELETE on /posts require a valid JWT.
    authRequired: toBool(env.AUTH_REQUIRED, false),
    corsOrigin: parseOrigins(env.CORS_ORIGIN),
    bcryptRounds: toInt(env.BCRYPT_ROUNDS, 10),
    authRateLimit: {
      windowMs: toInt(env.AUTH_RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000),
      max: toInt(env.AUTH_RATE_LIMIT_MAX, 100),
    },
    logRequests: toBool(env.LOG_REQUESTS, nodeEnv !== 'test'),
    // Render/Railway sit behind a proxy; needed for correct client IPs (rate limiting).
    trustProxy: toBool(env.TRUST_PROXY, isProduction),
  };
}

module.exports = { loadConfig, STORAGE_DRIVERS };
