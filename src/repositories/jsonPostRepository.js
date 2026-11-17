/**
 * Post repository for the "memory" and "file" drivers.
 *
 * Every repository exposes the same async interface so controllers never care
 * where the data lives:
 *   isValidId, list, getById, create, update, remove, clear
 */
const { randomUUID } = require('crypto');
const { queryPosts } = require('../utils/queryPosts');

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

class JsonPostRepository {
  constructor(store) {
    this.store = store;
  }

  isValidId(id) {
    return typeof id === 'string' && UUID_RE.test(id);
  }

  async list(query) {
    return queryPosts(this.store.items, query);
  }

  async getById(id) {
    const post = this.store.items.find((item) => item.id === id);
    return post ? { ...post } : null;
  }

  async create({ title, content, author, category }) {
    const now = new Date().toISOString();
    const post = { id: randomUUID(), title, content, author, category, createdAt: now, updatedAt: now };
    await this.store.commit([...this.store.items, post]);
    return { ...post };
  }

  async update(id, changes) {
    const index = this.store.items.findIndex((item) => item.id === id);
    if (index === -1) return null;

    const updated = { ...this.store.items[index], ...changes, updatedAt: new Date().toISOString() };
    const next = [...this.store.items];
    next[index] = updated;
    await this.store.commit(next);
    return { ...updated };
  }

  async remove(id) {
    const index = this.store.items.findIndex((item) => item.id === id);
    if (index === -1) return null;

    const removed = this.store.items[index];
    await this.store.commit(this.store.items.filter((_, i) => i !== index));
    return { ...removed };
  }

  async clear() {
    await this.store.commit([]);
  }
}

module.exports = JsonPostRepository;
