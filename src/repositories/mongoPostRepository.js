/**
 * Post repository for the "mongo" driver (MongoDB + Mongoose).
 * Mirrors the interface of JsonPostRepository.
 */
const mongoose = require('mongoose');
const Post = require('../models/Post');
const escapeRegex = require('../utils/escapeRegex');

function toApi(doc) {
  return {
    id: String(doc._id),
    title: doc.title,
    content: doc.content,
    author: doc.author,
    category: doc.category,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

const exactCaseInsensitive = (value) => new RegExp(`^${escapeRegex(value)}$`, 'i');

class MongoPostRepository {
  isValidId(id) {
    return typeof id === 'string' && /^[0-9a-fA-F]{24}$/.test(id) && mongoose.isValidObjectId(id);
  }

  async list({ search, category, author, sort = 'createdAt', order = 'desc', page, limit } = {}) {
    const filter = {};
    if (category) filter.category = exactCaseInsensitive(category);
    if (author) filter.author = exactCaseInsensitive(author);
    if (search) {
      const pattern = new RegExp(escapeRegex(search), 'i');
      filter.$or = [{ title: pattern }, { content: pattern }, { author: pattern }, { category: pattern }];
    }

    const direction = order === 'asc' ? 1 : -1;
    // `_id` is a tie-breaker so ordering is deterministic.
    const sortSpec = { [sort]: direction, _id: direction };
    const collation = { locale: 'en', strength: 2 }; // case-insensitive text sorting

    const total = await Post.countDocuments(filter);
    const paginated = page !== undefined || limit !== undefined;

    let cursor = Post.find(filter).sort(sortSpec).collation(collation);
    if (!paginated) {
      const docs = await cursor.lean();
      return { items: docs.map(toApi), total };
    }

    const currentPage = page ?? 1;
    const pageSize = limit ?? 10;
    const docs = await cursor.skip((currentPage - 1) * pageSize).limit(pageSize).lean();
    return {
      items: docs.map(toApi),
      total,
      page: currentPage,
      limit: pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async getById(id) {
    const doc = await Post.findById(id).lean();
    return doc ? toApi(doc) : null;
  }

  async create(data) {
    const doc = await Post.create(data);
    return toApi(doc.toObject());
  }

  async update(id, changes) {
    const doc = await Post.findByIdAndUpdate(
      id,
      { $set: changes },
      { returnDocument: 'after', runValidators: true }
    ).lean();
    return doc ? toApi(doc) : null;
  }

  async remove(id) {
    const doc = await Post.findByIdAndDelete(id).lean();
    return doc ? toApi(doc) : null;
  }

  async clear() {
    await Post.deleteMany({});
  }
}

module.exports = MongoPostRepository;
