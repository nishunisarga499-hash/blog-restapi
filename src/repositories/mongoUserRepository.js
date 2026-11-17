/**
 * User repository for the "mongo" driver. Mirrors JsonUserRepository.
 */
const mongoose = require('mongoose');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');

function toUser(doc) {
  return {
    id: String(doc._id),
    username: doc.username,
    email: doc.email,
    passwordHash: doc.passwordHash,
    createdAt: doc.createdAt.toISOString(),
  };
}

class MongoUserRepository {
  isValidId(id) {
    return typeof id === 'string' && /^[0-9a-fA-F]{24}$/.test(id) && mongoose.isValidObjectId(id);
  }

  async findByEmail(email) {
    const doc = await User.findOne({ email }).lean();
    return doc ? toUser(doc) : null;
  }

  async findById(id) {
    const doc = await User.findById(id).lean();
    return doc ? toUser(doc) : null;
  }

  async create({ username, email, passwordHash }) {
    try {
      const doc = await User.create({ username, email, passwordHash });
      return toUser(doc.toObject());
    } catch (err) {
      if (err && err.code === 11000) {
        throw ApiError.conflict('An account with this email already exists');
      }
      throw err;
    }
  }

  async clear() {
    await User.deleteMany({});
  }
}

module.exports = MongoUserRepository;
