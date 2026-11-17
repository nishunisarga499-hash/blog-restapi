/**
 * JWT authentication tests: register, login, /auth/me, and protected writes
 * (AUTH_REQUIRED=true).
 */
const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const request = require('supertest');
const { buildTestApp, validPost } = require('./helpers');

const USER = { username: 'asha_rao', email: 'Asha@Example.com', password: 'S3cure-passw0rd' };

describe('POST /auth/register', () => {
  let app;
  beforeEach(async () => ({ app } = await buildTestApp()));

  it('registers a user, returns a token and never exposes the password', async () => {
    const res = await request(app).post('/auth/register').send(USER);

    assert.equal(res.status, 201);
    assert.equal(res.body.data.user.email, 'asha@example.com'); // normalised to lowercase
    assert.equal(res.body.data.user.username, 'asha_rao');
    assert.ok(res.body.data.token);
    assert.equal(res.body.data.user.password, undefined);
    assert.equal(res.body.data.user.passwordHash, undefined);
    assert.ok(!JSON.stringify(res.body).includes(USER.password));
  });

  it('rejects a duplicate email with 409 (case-insensitive)', async () => {
    await request(app).post('/auth/register').send(USER).expect(201);
    const res = await request(app).post('/auth/register').send({ ...USER, email: 'ASHA@example.com' });
    assert.equal(res.status, 409);
  });

  it('validates username, email and password', async () => {
    const res = await request(app)
      .post('/auth/register')
      .send({ username: 'a!', email: 'not-an-email', password: 'short' });

    assert.equal(res.status, 400);
    assert.deepEqual(res.body.error.details.map((d) => d.field).sort(), ['email', 'password', 'username']);
  });

  it('rejects passwords longer than 72 characters (bcrypt limit)', async () => {
    const res = await request(app).post('/auth/register').send({ ...USER, password: 'a'.repeat(73) });
    assert.equal(res.status, 400);
  });

  it('rejects a missing body', async () => {
    const res = await request(app).post('/auth/register');
    assert.equal(res.status, 400);
  });
});

describe('POST /auth/login and GET /auth/me', () => {
  let app;
  beforeEach(async () => {
    ({ app } = await buildTestApp());
    await request(app).post('/auth/register').send(USER).expect(201);
  });

  it('logs in with correct credentials', async () => {
    const res = await request(app).post('/auth/login').send({ email: 'asha@example.com', password: USER.password });
    assert.equal(res.status, 200);
    assert.ok(res.body.data.token);
  });

  it('rejects a wrong password and an unknown email with the same 401 message', async () => {
    const wrongPassword = await request(app).post('/auth/login').send({ email: USER.email, password: 'wrong-password' });
    const unknownUser = await request(app).post('/auth/login').send({ email: 'nobody@example.com', password: 'whatever123' });

    assert.equal(wrongPassword.status, 401);
    assert.equal(unknownUser.status, 401);
    assert.equal(wrongPassword.body.error.message, unknownUser.body.error.message);
  });

  it('validates the login body', async () => {
    const res = await request(app).post('/auth/login').send({ email: 'bad' });
    assert.equal(res.status, 400);
  });

  it('GET /auth/me returns the current user for a valid token', async () => {
    const login = await request(app).post('/auth/login').send({ email: USER.email, password: USER.password });
    const res = await request(app).get('/auth/me').set('Authorization', `Bearer ${login.body.data.token}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.data.email, 'asha@example.com');
    assert.equal(res.body.data.passwordHash, undefined);
  });

  it('GET /auth/me returns 401 without a token', async () => {
    const res = await request(app).get('/auth/me');
    assert.equal(res.status, 401);
  });
});

describe('Protected writes (AUTH_REQUIRED=true)', () => {
  let app;
  let config;
  let token;

  beforeEach(async () => {
    ({ app, config } = await buildTestApp({ authRequired: true }));
    const res = await request(app).post('/auth/register').send(USER);
    token = res.body.data.token;
  });

  const bearer = () => ({ Authorization: `Bearer ${token}` });

  it('keeps reads public', async () => {
    assert.equal((await request(app).get('/posts')).status, 200);
  });

  it('blocks create/update/delete without a token (401)', async () => {
    const created = await request(app).post('/posts').set(bearer()).send(validPost());
    const id = created.body.data.id;

    assert.equal((await request(app).post('/posts').send(validPost())).status, 401);
    assert.equal((await request(app).put(`/posts/${id}`).send({ title: 'No token here' })).status, 401);
    assert.equal((await request(app).patch(`/posts/${id}`).send({ title: 'No token here' })).status, 401);
    assert.equal((await request(app).delete(`/posts/${id}`)).status, 401);

    // ...and the post is untouched
    assert.equal((await request(app).get(`/posts/${id}`)).body.data.title, validPost().title);
  });

  it('allows create/update/delete with a valid token', async () => {
    const created = await request(app).post('/posts').set(bearer()).send(validPost());
    assert.equal(created.status, 201);
    const id = created.body.data.id;

    assert.equal((await request(app).put(`/posts/${id}`).set(bearer()).send({ title: 'Edited with token' })).status, 200);
    assert.equal((await request(app).delete(`/posts/${id}`).set(bearer())).status, 200);
  });

  it('rejects a garbage token', async () => {
    const res = await request(app).post('/posts').set('Authorization', 'Bearer not.a.jwt').send(validPost());
    assert.equal(res.status, 401);
    assert.equal(res.body.error.message, 'Invalid token');
  });

  it('rejects a malformed Authorization header', async () => {
    const res = await request(app).post('/posts').set('Authorization', token).send(validPost());
    assert.equal(res.status, 401);
  });

  it('rejects a token signed with a different secret', async () => {
    const forged = jwt.sign({ sub: 'x' }, 'some-other-secret');
    const res = await request(app).post('/posts').set('Authorization', `Bearer ${forged}`).send(validPost());
    assert.equal(res.status, 401);
  });

  it('rejects an expired token', async () => {
    const userId = (await request(app).get('/auth/me').set(bearer())).body.data.id;
    const expired = jwt.sign({ sub: userId }, config.jwtSecret, { expiresIn: -10 });
    const res = await request(app).post('/posts').set('Authorization', `Bearer ${expired}`).send(validPost());
    assert.equal(res.status, 401);
    assert.match(res.body.error.message, /expired/);
  });

  it('rejects an unsigned (alg=none) token', async () => {
    const none = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
    const body = Buffer.from(JSON.stringify({ sub: 'x' })).toString('base64url');
    const res = await request(app).post('/posts').set('Authorization', `Bearer ${none}.${body}.`).send(validPost());
    assert.equal(res.status, 401);
  });

  it('runs authentication before validation', async () => {
    const res = await request(app).post('/posts').send({});
    assert.equal(res.status, 401);
  });
});

describe('Auth rate limiting', () => {
  it('returns 429 after too many attempts', async () => {
    const { app } = await buildTestApp({ authRateLimit: { windowMs: 60_000, max: 3 } });
    const attempt = () => request(app).post('/auth/login').send({ email: 'a@b.co', password: 'password123' });

    for (let i = 0; i < 3; i++) assert.equal((await attempt()).status, 401);
    const blocked = await attempt();
    assert.equal(blocked.status, 429);
    assert.equal(blocked.body.success, false);
  });
});
