/**
 * Mongoose model for a blog post (MongoDB driver only).
 * `timestamps: true` maintains createdAt (the "Created Date") and updatedAt.
 */
const mongoose = require('mongoose');

const postSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, minlength: 3, maxlength: 150 },
    content: { type: String, required: true, trim: true, minlength: 10, maxlength: 20000 },
    author: { type: String, required: true, trim: true, minlength: 2, maxlength: 100 },
    category: { type: String, required: true, trim: true, minlength: 2, maxlength: 50 },
  },
  { timestamps: true }
);

postSchema.index({ createdAt: -1 });
postSchema.index({ category: 1 });

module.exports = mongoose.models.Post || mongoose.model('Post', postSchema);
