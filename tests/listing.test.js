/**
 * GET /posts - list, pagination, search, filter and sort.
 */
const { describe, it, before } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { buildTestApp, validPost } = require('./helpers');

const SAMPLES = [
  { title: 'Node basics', content: 'Learning how Node.js works under the hood', author: 'Asha Rao', category: 'Backend' },
  { title: 'Express routing', content: 'Routes map URLs to handler functions in Express', author: 'Asha Rao', category: 'Backend' },
  { title: 'CSS layouts', content: 'Grid and flexbox make responsive pages simple', author: 'Meera Nair', category: 'Frontend' },
  { title: 'React hooks', content: 'Hooks let function components keep state', author: 'Meera Nair', category: 'Frontend' },
  { title: 'Zebra database', content: 'Indexes speed up queries in a Mongo collection', author: 'Ravi Kumar', category: 'Database' },
];

describe('GET /posts (list, search, filter, sort, paginate)', () => {
  let app;

  before(async () => {
    ({ app } = await buildTestApp());
    for (const post of SAMPLES) {
      await request(app).post('/posts').send(validPost(post)).expect(201);
    }
  });

  it('returns an empty list (not an error) when there are no posts', async () => {
    const { app: emptyApp } = await buildTestApp();
    const res = await request(emptyApp).get('/posts');
    assert.equal(res.status, 200);
    assert.deepEqual(res.body.data, []);
    assert.equal(res.body.total, 0);
  });

  it('returns ALL posts when no pagination is requested', async () => {
    const res = await request(app).get('/posts');
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.count, 5);
    assert.equal(res.body.total, 5);
    assert.equal(res.body.page, undefined);
    assert.equal(res.body.data.length, 5);
  });

  it('defaults to newest first', async () => {
    const res = await request(app).get('/posts');
    assert.deepEqual(
      res.body.data.map((p) => p.title),
      ['Zebra database', 'React hooks', 'CSS layouts', 'Express routing', 'Node basics']
    );
  });

  it('paginates with page and limit', async () => {
    const res = await request(app).get('/posts?page=2&limit=2&sort=createdAt');
    assert.equal(res.status, 200);
    assert.equal(res.body.page, 2);
    assert.equal(res.body.limit, 2);
    assert.equal(res.body.totalPages, 3);
    assert.equal(res.body.total, 5);
    assert.equal(res.body.count, 2);
    assert.deepEqual(res.body.data.map((p) => p.title), ['CSS layouts', 'React hooks']);
  });

  it('uses limit=10 when only page is given', async () => {
    const res = await request(app).get('/posts?page=1');
    assert.equal(res.body.limit, 10);
    assert.equal(res.body.count, 5);
  });

  it('returns an empty page beyond the last page', async () => {
    const res = await request(app).get('/posts?page=99&limit=2');
    assert.equal(res.status, 200);
    assert.equal(res.body.count, 0);
    assert.equal(res.body.total, 5);
  });

  it('filters by category (case-insensitive)', async () => {
    const res = await request(app).get('/posts?category=frontend');
    assert.equal(res.body.total, 2);
    assert.ok(res.body.data.every((p) => p.category === 'Frontend'));
  });

  it('filters by author', async () => {
    const res = await request(app).get('/posts?author=ravi%20kumar');
    assert.equal(res.body.total, 1);
    assert.equal(res.body.data[0].title, 'Zebra database');
  });

  it('searches title, content, author and category', async () => {
    assert.equal((await request(app).get('/posts?search=hooks')).body.total, 1); // title + content
    assert.equal((await request(app).get('/posts?search=mongo')).body.total, 1); // content
    assert.equal((await request(app).get('/posts?search=meera')).body.total, 2); // author
    assert.equal((await request(app).get('/posts?search=DATABASE')).body.total, 1); // category/title, case-insens.
  });

  it('treats search input literally (no regex injection)', async () => {
    const res = await request(app).get('/posts?search=.*');
    assert.equal(res.status, 200);
    assert.equal(res.body.total, 0);
  });

  it('combines filters, search and pagination', async () => {
    const res = await request(app).get('/posts?category=Backend&search=express&page=1&limit=5');
    assert.equal(res.body.total, 1);
    assert.equal(res.body.data[0].title, 'Express routing');
  });

  it('sorts ascending and descending by title', async () => {
    const asc = await request(app).get('/posts?sort=title');
    assert.deepEqual(asc.body.data.map((p) => p.title), [
      'CSS layouts',
      'Express routing',
      'Node basics',
      'React hooks',
      'Zebra database',
    ]);

    const desc = await request(app).get('/posts?sort=-title');
    assert.equal(desc.body.data[0].title, 'Zebra database');

    const explicit = await request(app).get('/posts?sort=title&order=desc');
    assert.equal(explicit.body.data[0].title, 'Zebra database');
  });

  it('sorts oldest first with sort=createdAt', async () => {
    const res = await request(app).get('/posts?sort=createdAt');
    assert.equal(res.body.data[0].title, 'Node basics');
  });

  it('rejects invalid pagination values with 400', async () => {
    for (const qs of ['page=0', 'page=-1', 'page=abc', 'limit=0', 'limit=101', 'limit=1.5']) {
      const res = await request(app).get(`/posts?${qs}`);
      assert.equal(res.status, 400, `expected 400 for ?${qs}`);
      assert.equal(res.body.error.message, 'Invalid query parameters');
    }
  });

  it('rejects an invalid sort field or order', async () => {
    assert.equal((await request(app).get('/posts?sort=password')).status, 400);
    assert.equal((await request(app).get('/posts?order=sideways')).status, 400);
  });

  it('rejects a query parameter supplied more than once', async () => {
    const res = await request(app).get('/posts?category=a&category=b');
    assert.equal(res.status, 400);
  });
});
