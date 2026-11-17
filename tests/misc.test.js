/**
 * System routes, error handling and the JSON-file storage driver.
 */
const { describe, it, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const request = require('supertest');
const { loadConfig } = require('../src/config');
const { createRepositories } = require('../src/repositories');
const { createApp } = require('../src/app');
const { buildTestApp, validPost } = require('./helpers');

describe('System routes and error handling', () => {
  it('GET /health returns ok', async () => {
    const { app } = await buildTestApp();
    const res = await request(app).get('/health');
    assert.equal(res.status, 200);
    assert.equal(res.body.status, 'ok');
    assert.equal(res.body.storage, 'memory');
  });

  it('GET / describes the API', async () => {
    const { app } = await buildTestApp();
    const res = await request(app).get('/');
    assert.equal(res.status, 200);
    assert.equal(res.body.docs, '/api-docs');
  });

  it('unknown routes return a JSON 404', async () => {
    const { app } = await buildTestApp();
    const res = await request(app).get('/does-not-exist');
    assert.equal(res.status, 404);
    assert.equal(res.body.success, false);
    assert.match(res.headers['content-type'], /json/);
  });

  it('Swagger UI and the OpenAPI JSON are served', async () => {
    const { app } = await buildTestApp();

    const json = await request(app).get('/api-docs.json');
    assert.equal(json.status, 200);
    assert.equal(json.body.openapi, '3.0.3');
    for (const route of ['/posts', '/posts/{id}', '/auth/register', '/auth/login']) {
      assert.ok(json.body.paths[route], `missing ${route} in OpenAPI spec`);
    }

    const ui = await request(app).get('/api-docs/').redirects(1);
    assert.equal(ui.status, 200);
    assert.match(ui.text, /swagger-ui/i);
  });

  it('sets security headers and hides X-Powered-By', async () => {
    const { app } = await buildTestApp();
    const res = await request(app).get('/health');
    assert.equal(res.headers['x-powered-by'], undefined);
    assert.equal(res.headers['x-content-type-options'], 'nosniff');
  });

  it('does not leak internals on unexpected errors (500)', async () => {
    const { app, repositories } = await buildTestApp();
    repositories.posts.list = async () => {
      throw new Error('secret database password is hunter2');
    };
    const original = console.error;
    console.error = () => {}; // keep test output clean
    try {
      const res = await request(app).get('/posts');
      assert.equal(res.status, 500);
      assert.equal(res.body.error.message, 'Internal server error');
      assert.ok(!JSON.stringify(res.body).includes('hunter2'));
    } finally {
      console.error = original;
    }
  });

  it('config rejects invalid settings', () => {
    assert.throws(() => loadConfig({ STORAGE_DRIVER: 'oracle', JWT_SECRET: 'x' }), /Invalid STORAGE_DRIVER/);
    assert.throws(() => loadConfig({ STORAGE_DRIVER: 'mongo', JWT_SECRET: 'x' }), /MONGODB_URI/);
    assert.throws(() => loadConfig({ NODE_ENV: 'production' }), /JWT_SECRET/);
  });
});

describe('JSON file storage driver', () => {
  let dir;
  afterEach(() => dir && fs.rmSync(dir, { recursive: true, force: true }));

  const fileConfig = () =>
    loadConfig({
      NODE_ENV: 'test',
      STORAGE_DRIVER: 'file',
      DATA_DIR: dir,
      JWT_SECRET: 'test-secret',
      BCRYPT_ROUNDS: '4',
      LOG_REQUESTS: 'false',
    });

  it('persists posts to disk and reloads them after a "restart"', async () => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'blog-api-test-'));
    const config = fileConfig();

    // First "run": create a post
    let repositories = await createRepositories(config);
    let app = createApp({ config, repositories });
    const created = await request(app).post('/posts').send(validPost());
    assert.equal(created.status, 201);

    const onDisk = JSON.parse(fs.readFileSync(path.join(dir, 'posts.json'), 'utf8'));
    assert.equal(onDisk.length, 1);
    assert.equal(onDisk[0].title, validPost().title);

    // Second "run": brand-new repositories read the same file
    repositories = await createRepositories(config);
    app = createApp({ config, repositories });
    const listed = await request(app).get('/posts');
    assert.equal(listed.body.total, 1);
    assert.equal(listed.body.data[0].id, created.body.data.id);

    // Update + delete are persisted too
    await request(app).put(`/posts/${created.body.data.id}`).send({ title: 'Changed on disk' });
    assert.equal(JSON.parse(fs.readFileSync(path.join(dir, 'posts.json'), 'utf8'))[0].title, 'Changed on disk');
    await request(app).delete(`/posts/${created.body.data.id}`);
    assert.deepEqual(JSON.parse(fs.readFileSync(path.join(dir, 'posts.json'), 'utf8')), []);
  });

  it('handles many concurrent writes without losing data', async () => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'blog-api-test-'));
    const config = fileConfig();
    const repositories = await createRepositories(config);
    const app = createApp({ config, repositories });

    const responses = await Promise.all(
      Array.from({ length: 25 }, (_, i) => request(app).post('/posts').send(validPost({ title: `Concurrent post ${i}` })))
    );
    assert.ok(responses.every((r) => r.status === 201));

    const onDisk = JSON.parse(fs.readFileSync(path.join(dir, 'posts.json'), 'utf8'));
    assert.equal(onDisk.length, 25);
    assert.equal(new Set(onDisk.map((p) => p.id)).size, 25);
  });

  it('refuses to start on a corrupted data file with a clear message', async () => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'blog-api-test-'));
    fs.writeFileSync(path.join(dir, 'posts.json'), '{ not valid json');
    await assert.rejects(() => createRepositories(fileConfig()), /invalid JSON/);
  });
});
