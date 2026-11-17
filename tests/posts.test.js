/**
 * CRUD tests for /posts (no authentication required - AUTH_REQUIRED=false).
 */
const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { buildTestApp, validPost, NON_EXISTENT_ID } = require('./helpers');

describe('POST /posts (create)', () => {
  let app;
  beforeEach(async () => ({ app } = await buildTestApp()));

  it('creates a post and returns 201 with id and createdAt', async () => {
    const res = await request(app).post('/posts').send(validPost());

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.title, 'Understanding REST APIs');
    assert.equal(res.body.data.author, 'Asha Rao');
    assert.equal(res.body.data.category, 'Backend');
    assert.ok(res.body.data.id);
    assert.ok(!Number.isNaN(Date.parse(res.body.data.createdAt)));
    assert.equal(res.headers.location, `/posts/${res.body.data.id}`);
  });

  it('trims whitespace from fields', async () => {
    const res = await request(app).post('/posts').send(validPost({ title: '   Padded title   ' }));
    assert.equal(res.status, 201);
    assert.equal(res.body.data.title, 'Padded title');
  });

  it('ignores client-supplied id and createdAt', async () => {
    const res = await request(app)
      .post('/posts')
      .send(validPost({ id: 'hacker', createdAt: '2000-01-01T00:00:00.000Z' }));
    assert.equal(res.status, 201);
    assert.notEqual(res.body.data.id, 'hacker');
    assert.notEqual(res.body.data.createdAt, '2000-01-01T00:00:00.000Z');
  });

  it('rejects missing fields with 400 and per-field details', async () => {
    const res = await request(app).post('/posts').send({ title: 'Only a title' });

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error.message, 'Validation failed');
    const fields = res.body.error.details.map((d) => d.field).sort();
    assert.deepEqual(fields, ['author', 'category', 'content']);
  });

  it('rejects an empty body', async () => {
    const res = await request(app).post('/posts').send({});
    assert.equal(res.status, 400);
    assert.equal(res.body.error.details.length, 4);
  });

  it('rejects a request with no body at all', async () => {
    const res = await request(app).post('/posts');
    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
  });

  it('rejects values that are too short', async () => {
    const res = await request(app).post('/posts').send(validPost({ title: 'ab', content: 'short' }));
    assert.equal(res.status, 400);
    const messages = res.body.error.details.map((d) => d.message).join(' | ');
    assert.match(messages, /title must be at least 3/);
    assert.match(messages, /content must be at least 10/);
  });

  it('rejects values that are too long', async () => {
    const res = await request(app).post('/posts').send(validPost({ title: 'x'.repeat(151) }));
    assert.equal(res.status, 400);
    assert.match(res.body.error.details[0].message, /at most 150/);
  });

  it('rejects whitespace-only values', async () => {
    const res = await request(app).post('/posts').send(validPost({ author: '     ' }));
    assert.equal(res.status, 400);
    assert.match(res.body.error.details[0].message, /must not be empty/);
  });

  it('rejects non-string values', async () => {
    const res = await request(app).post('/posts').send(validPost({ title: 12345, category: null }));
    assert.equal(res.status, 400);
    assert.equal(res.body.error.details.length, 2);
    assert.ok(res.body.error.details.every((d) => /must be a string/.test(d.message)));
  });

  it('rejects unknown fields', async () => {
    const res = await request(app).post('/posts').send(validPost({ isAdmin: true }));
    assert.equal(res.status, 400);
    assert.match(res.body.error.details[0].message, /Unknown field "isAdmin"/);
  });

  it('rejects a JSON array body', async () => {
    const res = await request(app).post('/posts').send([validPost()]);
    assert.equal(res.status, 400);
  });

  it('returns 400 for malformed JSON', async () => {
    const res = await request(app)
      .post('/posts')
      .set('Content-Type', 'application/json')
      .send('{"title": "broken",');
    assert.equal(res.status, 400);
    assert.equal(res.body.error.message, 'Malformed JSON in request body');
  });

  it('returns 413 for an oversized body', async () => {
    const res = await request(app)
      .post('/posts')
      .send(validPost({ content: 'x'.repeat(200 * 1024) }));
    assert.equal(res.status, 413);
  });
});

describe('GET /posts/:id (read one)', () => {
  let app;
  beforeEach(async () => ({ app } = await buildTestApp()));

  it('returns the post with 200', async () => {
    const created = await request(app).post('/posts').send(validPost());
    const res = await request(app).get(`/posts/${created.body.data.id}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.deepEqual(res.body.data, created.body.data);
  });

  it('returns 404 when the post does not exist', async () => {
    const res = await request(app).get(`/posts/${NON_EXISTENT_ID}`);
    assert.equal(res.status, 404);
    assert.equal(res.body.success, false);
    assert.match(res.body.error.message, /not found/);
  });

  it('returns 400 for a malformed id', async () => {
    const res = await request(app).get('/posts/not-a-valid-id');
    assert.equal(res.status, 400);
    assert.match(res.body.error.message, /Invalid post id/);
  });
});

describe('PUT/PATCH /posts/:id (update)', () => {
  let app;
  let id;
  beforeEach(async () => {
    ({ app } = await buildTestApp());
    id = (await request(app).post('/posts').send(validPost())).body.data.id;
  });

  it('updates all editable fields', async () => {
    const res = await request(app).put(`/posts/${id}`).send({
      title: 'Updated title',
      content: 'Updated content that is long enough',
      category: 'Architecture',
      author: 'Ravi Kumar',
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.data.title, 'Updated title');
    assert.equal(res.body.data.content, 'Updated content that is long enough');
    assert.equal(res.body.data.category, 'Architecture');
    assert.equal(res.body.data.author, 'Ravi Kumar');
  });

  it('allows updating a single field and keeps the rest', async () => {
    const res = await request(app).put(`/posts/${id}`).send({ title: 'Only the title changed' });

    assert.equal(res.status, 200);
    assert.equal(res.body.data.title, 'Only the title changed');
    assert.equal(res.body.data.author, 'Asha Rao');
    assert.equal(res.body.data.category, 'Backend');
  });

  it('PATCH behaves the same as PUT', async () => {
    const res = await request(app).patch(`/posts/${id}`).send({ category: 'DevOps' });
    assert.equal(res.status, 200);
    assert.equal(res.body.data.category, 'DevOps');
  });

  it('keeps createdAt and refreshes updatedAt', async () => {
    const before = (await request(app).get(`/posts/${id}`)).body.data;
    await new Promise((r) => setTimeout(r, 5));
    const res = await request(app).put(`/posts/${id}`).send({ title: 'A fresh new title' });

    assert.equal(res.body.data.createdAt, before.createdAt);
    assert.ok(res.body.data.updatedAt > before.updatedAt);
  });

  it('ignores attempts to change id and createdAt', async () => {
    const before = (await request(app).get(`/posts/${id}`)).body.data;
    const res = await request(app)
      .put(`/posts/${id}`)
      .send({ id: NON_EXISTENT_ID, createdAt: '1999-01-01T00:00:00.000Z', title: 'Still allowed' });

    assert.equal(res.status, 200);
    assert.equal(res.body.data.id, before.id);
    assert.equal(res.body.data.createdAt, before.createdAt);
  });

  it('persists the change (visible on next GET)', async () => {
    await request(app).put(`/posts/${id}`).send({ author: 'New Author' });
    const res = await request(app).get(`/posts/${id}`);
    assert.equal(res.body.data.author, 'New Author');
  });

  it('rejects an update with no editable fields', async () => {
    const res = await request(app).put(`/posts/${id}`).send({});
    assert.equal(res.status, 400);
    assert.match(res.body.error.details[0].message, /at least one field/);
  });

  it('rejects invalid values', async () => {
    const res = await request(app).put(`/posts/${id}`).send({ title: 'x' });
    assert.equal(res.status, 400);
    assert.equal(res.body.error.details[0].field, 'title');
  });

  it('returns 404 for a post that does not exist', async () => {
    const res = await request(app).put(`/posts/${NON_EXISTENT_ID}`).send({ title: 'Does not matter' });
    assert.equal(res.status, 404);
  });

  it('returns 400 for a malformed id', async () => {
    const res = await request(app).put('/posts/123').send({ title: 'Does not matter' });
    assert.equal(res.status, 400);
  });
});

describe('DELETE /posts/:id', () => {
  let app;
  beforeEach(async () => ({ app } = await buildTestApp()));

  it('deletes the post and returns 200 with the deleted post', async () => {
    const created = await request(app).post('/posts').send(validPost());
    const id = created.body.data.id;

    const res = await request(app).delete(`/posts/${id}`);
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.message, 'Blog post deleted successfully');
    assert.equal(res.body.data.id, id);

    assert.equal((await request(app).get(`/posts/${id}`)).status, 404);
    assert.equal((await request(app).get('/posts')).body.total, 0);
  });

  it('returns 404 when deleting the same post twice', async () => {
    const id = (await request(app).post('/posts').send(validPost())).body.data.id;
    await request(app).delete(`/posts/${id}`);
    const res = await request(app).delete(`/posts/${id}`);
    assert.equal(res.status, 404);
  });

  it('returns 404 for an unknown id', async () => {
    const res = await request(app).delete(`/posts/${NON_EXISTENT_ID}`);
    assert.equal(res.status, 404);
  });

  it('returns 400 for a malformed id', async () => {
    const res = await request(app).delete('/posts/abc');
    assert.equal(res.status, 400);
  });
});
