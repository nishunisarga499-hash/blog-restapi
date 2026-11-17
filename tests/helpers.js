/**
 * Shared test helpers: builds a fresh Express app backed by the in-memory driver.
 */
const { loadConfig } = require('../src/config');
const { createApp } = require('../src/app');
const { createRepositories } = require('../src/repositories');

async function buildTestApp(overrides = {}) {
  const config = {
    ...loadConfig({
      NODE_ENV: 'test',
      STORAGE_DRIVER: 'memory',
      JWT_SECRET: 'test-secret-do-not-use-in-production',
      BCRYPT_ROUNDS: '4', // fast hashing in tests
      LOG_REQUESTS: 'false',
    }),
    ...overrides,
  };
  const repositories = await createRepositories(config);
  const app = createApp({ config, repositories });
  return { app, config, repositories };
}

const validPost = (overrides = {}) => ({
  title: 'Understanding REST APIs',
  content: 'REST is an architectural style built around resources and HTTP verbs.',
  author: 'Asha Rao',
  category: 'Backend',
  ...overrides,
});

const NON_EXISTENT_ID = '00000000-0000-4000-8000-000000000000';

module.exports = { buildTestApp, validPost, NON_EXISTENT_ID };
