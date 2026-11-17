/**
 * User repository for the "memory" and "file" drivers.
 */
const { randomUUID } = require('crypto');
const ApiError = require('../utils/ApiError');

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

class JsonUserRepository {
  constructor(store) {
    this.store = store;
  }

  isValidId(id) {
    return typeof id === 'string' && UUID_RE.test(id);
  }

  async findByEmail(email) {
    const user = this.store.items.find((item) => item.email === email);
    return user ? { ...user } : null;
  }

  async findById(id) {
    const user = this.store.items.find((item) => item.id === id);
    return user ? { ...user } : null;
  }

  async create({ username, email, passwordHash }) {
    // No `await` between this check and the commit below, so two simultaneous
    // sign-ups with the same email cannot both pass (Node is single-threaded).
    if (this.store.items.some((item) => item.email === email)) {
      throw ApiError.conflict('An account with this email already exists');
    }
    const user = {
      id: randomUUID(),
      username,
      email,
      passwordHash,
      createdAt: new Date().toISOString(),
    };
    await this.store.commit([...this.store.items, user]);
    return { ...user };
  }

  async clear() {
    await this.store.commit([]);
  }
}

module.exports = JsonUserRepository;
