/**
 * JsonStore - a tiny array-backed store used by the "memory" and "file" drivers.
 *
 *  - filePath = null  -> pure in-memory (data is lost when the process stops)
 *  - filePath = "..." -> every change is also written to a JSON file
 *
 * Writes are serialised through a promise queue and use write-to-temp-then-rename
 * so a crash in the middle of a write can never leave a half-written file.
 */
const fs = require('fs/promises');
const path = require('path');

class JsonStore {
  constructor(filePath = null) {
    this.filePath = filePath;
    this.items = [];
    this._queue = Promise.resolve();
  }

  async init() {
    if (!this.filePath) return;

    await fs.mkdir(path.dirname(this.filePath), { recursive: true });

    try {
      const raw = await fs.readFile(this.filePath, 'utf8');
      const parsed = raw.trim() ? JSON.parse(raw) : [];
      if (!Array.isArray(parsed)) {
        throw new Error(`${this.filePath} must contain a JSON array`);
      }
      this.items = parsed;
    } catch (err) {
      if (err.code === 'ENOENT') {
        await this._flush(); // first run: create an empty file
      } else if (err instanceof SyntaxError) {
        throw new Error(`${this.filePath} contains invalid JSON: ${err.message}`);
      } else {
        throw err;
      }
    }
  }

  /** Persist the current items (no-op for the in-memory driver). */
  save() {
    if (!this.filePath) return Promise.resolve();
    this._queue = this._queue.catch(() => {}).then(() => this._flush());
    return this._queue;
  }

  /**
   * Replace the item list and persist it. If persisting fails the previous
   * list is restored so memory and disk never disagree.
   */
  async commit(nextItems) {
    const previous = this.items;
    this.items = nextItems;
    try {
      await this.save();
    } catch (err) {
      if (this.items === nextItems) this.items = previous;
      throw err;
    }
  }

  async _flush() {
    const tmpPath = `${this.filePath}.tmp`;
    await fs.writeFile(tmpPath, JSON.stringify(this.items, null, 2), 'utf8');
    await fs.rename(tmpPath, this.filePath);
  }
}

module.exports = JsonStore;
