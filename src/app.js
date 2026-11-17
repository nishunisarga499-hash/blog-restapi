/**
 * Express application factory.
 *
 * createApp() wires middleware and routes together but does NOT start listening -
 * server.js does that, and the tests import createApp() directly.
 */
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const swaggerUi = require('swagger-ui-express');

const openapi = require('./docs/openapi');
const requestLogger = require('./middleware/requestLogger');
const notFound = require('./middleware/notFound');
const errorHandler = require('./middleware/errorHandler');
const createAuthMiddleware = require('./middleware/auth');
const createPostRoutes = require('./routes/postRoutes');
const createAuthRoutes = require('./routes/authRoutes');

function createApp({ config, repositories }) {
  const app = express();

  app.disable('x-powered-by');
  if (config.trustProxy) app.set('trust proxy', 1);

  // Swagger UI needs inline scripts/styles, so it gets its own relaxed CSP.
  app.use(
    '/api-docs',
    helmet({ contentSecurityPolicy: false }),
    swaggerUi.serve,
    swaggerUi.setup(openapi, {
      customSiteTitle: 'Blog REST API Docs',
      swaggerOptions: { persistAuthorization: true },
    })
  );
  app.get('/api-docs.json', (req, res) => res.json(openapi));

  // Global middleware
  app.use(helmet());
  app.use(cors({ origin: config.corsOrigin }));
  app.use(requestLogger(config.logRequests));
  app.use(express.json({ limit: '100kb' }));

  const { authenticate, protectWrites } = createAuthMiddleware({
    config,
    usersRepo: repositories.users,
  });

  // System routes
  app.get('/', (req, res) => {
    res.json({
      name: 'Blog REST API',
      version: '1.0.0',
      docs: '/api-docs',
      endpoints: {
        posts: '/posts',
        auth: ['/auth/register', '/auth/login', '/auth/me'],
        health: '/health',
      },
    });
  });

  app.get('/health', (req, res) => {
    res.json({
      status: 'ok',
      uptimeSeconds: Math.round(process.uptime() * 10) / 10,
      storage: config.storageDriver,
      timestamp: new Date().toISOString(),
    });
  });

  // Resource routes
  app.use('/auth', createAuthRoutes({ config, usersRepo: repositories.users, authenticate }));
  app.use('/posts', createPostRoutes({ postsRepo: repositories.posts, protectWrites }));

  // 404 + central error handler (must be last)
  app.use(notFound);
  app.use(errorHandler);

  return app;
}

module.exports = { createApp };
