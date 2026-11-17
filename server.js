/**
 * Entry point: loads .env, connects the storage driver, starts the HTTP server
 * and shuts down gracefully on SIGINT/SIGTERM.
 */
require('dotenv').config({ quiet: true });

const { loadConfig } = require('./src/config');
const { createRepositories } = require('./src/repositories');
const { createApp } = require('./src/app');

async function main() {
  const config = loadConfig();
  const repositories = await createRepositories(config);
  const app = createApp({ config, repositories });

  const server = app.listen(config.port, () => {
    console.log(`Blog REST API running on port ${config.port} (${config.env})`);
    console.log(`  storage : ${config.storageDriver}`);
    console.log(`  auth    : writes ${config.authRequired ? 'REQUIRE a JWT' : 'are open (AUTH_REQUIRED=false)'}`);
    console.log(`  docs    : http://localhost:${config.port}/api-docs`);
  });

  let shuttingDown = false;
  async function shutdown(signal) {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`\n${signal} received - shutting down...`);
    server.close(async () => {
      await repositories.close().catch(() => {});
      process.exit(0);
    });
    // Force-exit if connections refuse to close.
    setTimeout(() => process.exit(1), 10000).unref();
  }
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

main().catch((err) => {
  console.error('Failed to start server:', err.message);
  process.exit(1);
});
