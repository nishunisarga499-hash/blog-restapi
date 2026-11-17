/**
 * MongoDB connection (only used when STORAGE_DRIVER=mongo).
 * mongoose is required lazily so the in-memory / file drivers work without it.
 */
async function connectDb(uri) {
  const mongoose = require('mongoose');
  mongoose.set('strictQuery', true);
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
  // Never log the URI: it normally contains the database password.
  console.log('[db] Connected to MongoDB');
}

async function disconnectDb() {
  const mongoose = require('mongoose');
  await mongoose.disconnect();
}

module.exports = { connectDb, disconnectDb };
