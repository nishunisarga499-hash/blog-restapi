/**
 * Mongoose model for an API user (MongoDB driver only).
 * Only the bcrypt hash of the password is ever stored.
 */
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

module.exports = mongoose.models.User || mongoose.model('User', userSchema);
