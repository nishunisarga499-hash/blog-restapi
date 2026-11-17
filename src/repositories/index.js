/**
 * Repository factory: picks the storage driver from config.storageDriver.
 *
 *   memory -> arrays in RAM            (tests, quick demos)
 *   file   -> JSON files in /data      (default; no database needed)
 *   mongo  -> MongoDB via Mongoose     (bonus; used for deployment)
 *
 * Returns { posts, users, close } - all drivers share the same interface.
 */
const path = require('path');
const JsonStore = require('./jsonStore');
const JsonPostRepository = require('./jsonPostRepository');
const JsonUserRepository = require('./jsonUserRepository');

async function createRepositories(config) {
  if (config.storageDriver === 'mongo') {
    const { connectDb, disconnectDb } = require('../config/db');
    await connectDb(config.mongoUri);

    const MongoPostRepository = require('./mongoPostRepository');
    const MongoUserRepository = require('./mongoUserRepository');
    return {
      posts: new MongoPostRepository(),
      users: new MongoUserRepository(),
      close: disconnectDb,
    };
  }

  const useFile = config.storageDriver === 'file';
  const postStore = new JsonStore(useFile ? path.join(config.dataDir, 'posts.json') : null);
  const userStore = new JsonStore(useFile ? path.join(config.dataDir, 'users.json') : null);
  await Promise.all([postStore.init(), userStore.init()]);

  return {
    posts: new JsonPostRepository(postStore),
    users: new JsonUserRepository(userStore),
    close: async () => {},
  };
}

module.exports = { createRepositories };
