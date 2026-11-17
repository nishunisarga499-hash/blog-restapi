/**
 * Generates postman/blog-rest-api.postman_collection.json
 *
 *   npm run postman:build
 *
 * The collection can be imported into Postman, Thunder Client (VS Code) or
 * Insomnia, and run top-to-bottom with the Collection Runner (or `newman`).
 * It works whether the server runs with AUTH_REQUIRED=false or true because the
 * collection sends the JWT it obtains from the Register/Login requests.
 */
const fs = require('fs');
const path = require('path');

const json = (value) => JSON.stringify(value, null, 2);

function test(name, body) {
  return `pm.test(${JSON.stringify(name)}, function () {\n${body
    .split('\n')
    .map((line) => '  ' + line)
    .join('\n')}\n});`;
}

function item(name, { method, url, body, noAuth = false, tests = [], prerequest = [] }) {
  const path = url.replace('{{baseUrl}}', '').split('?')[0].split('/').filter(Boolean);
  const request = {
    method,
    header: body !== undefined ? [{ key: 'Content-Type', value: 'application/json' }] : [],
    url: {
      raw: url,
      host: ['{{baseUrl}}'],
      path,
      ...(url.includes('?')
        ? {
            query: url
              .split('?')[1]
              .split('&')
              .map((pair) => {
                const [key, value] = pair.split('=');
                return { key, value };
              }),
          }
        : {}),
    },
  };
  if (body !== undefined) request.body = { mode: 'raw', raw: json(body), options: { raw: { language: 'json' } } };
  if (noAuth) request.auth = { type: 'noauth' };

  const event = [];
  if (prerequest.length) event.push({ listen: 'prerequest', script: { type: 'text/javascript', exec: prerequest } });
  if (tests.length) event.push({ listen: 'test', script: { type: 'text/javascript', exec: tests.join('\n\n').split('\n') } });

  return { name, event, request };
}

const validPost = {
  title: 'Understanding REST APIs',
  content: 'REST is an architectural style built around resources and HTTP verbs.',
  author: 'Asha Rao',
  category: 'Backend',
};

const statusTest = (code) => test(`Status code is ${code}`, `pm.response.to.have.status(${code});`);
const errorShape = test(
  'Error response has success=false and a message',
  `const body = pm.response.json();\npm.expect(body.success).to.eql(false);\npm.expect(body.error.message).to.be.a('string');`
);

const folders = [
  {
    name: '1. System',
    item: [
      item('Health check', {
        method: 'GET',
        url: '{{baseUrl}}/health',
        noAuth: true,
        tests: [statusTest(200), test('status is ok', `pm.expect(pm.response.json().status).to.eql('ok');`)],
      }),
    ],
  },
  {
    name: '2. Auth (JWT)',
    item: [
      item('Register user', {
        method: 'POST',
        url: '{{baseUrl}}/auth/register',
        noAuth: true,
        prerequest: [
          "pm.collectionVariables.set('email', 'user' + Date.now() + '@example.com');",
          "pm.collectionVariables.set('password', 'S3cure-passw0rd');",
        ],
        body: { username: 'postman_user', email: '{{email}}', password: '{{password}}' },
        tests: [
          statusTest(201),
          test(
            'returns user and token, never the password',
            `const body = pm.response.json();\npm.expect(body.data.token).to.be.a('string');\npm.expect(body.data.user).to.not.have.property('password');\npm.expect(body.data.user).to.not.have.property('passwordHash');\npm.collectionVariables.set('token', body.data.token);`
          ),
        ],
      }),
      item('Register - duplicate email (409)', {
        method: 'POST',
        url: '{{baseUrl}}/auth/register',
        noAuth: true,
        body: { username: 'postman_user', email: '{{email}}', password: '{{password}}' },
        tests: [statusCodeOrRateLimit(409), errorShape],
      }),
      item('Register - invalid input (400)', {
        method: 'POST',
        url: '{{baseUrl}}/auth/register',
        noAuth: true,
        body: { username: 'a!', email: 'not-an-email', password: 'short' },
        tests: [statusTest(400), errorShape],
      }),
      item('Login', {
        method: 'POST',
        url: '{{baseUrl}}/auth/login',
        noAuth: true,
        body: { email: '{{email}}', password: '{{password}}' },
        tests: [
          statusTest(200),
          test('returns a token', `const token = pm.response.json().data.token;\npm.expect(token).to.be.a('string');\npm.collectionVariables.set('token', token);`),
        ],
      }),
      item('Login - wrong password (401)', {
        method: 'POST',
        url: '{{baseUrl}}/auth/login',
        noAuth: true,
        body: { email: '{{email}}', password: 'definitely-wrong' },
        tests: [statusTest(401), errorShape],
      }),
      item('Current user (GET /auth/me)', {
        method: 'GET',
        url: '{{baseUrl}}/auth/me',
        tests: [
          statusTest(200),
          test('returns the logged-in user', `pm.expect(pm.response.json().data.email).to.eql(pm.collectionVariables.get('email'));`),
        ],
      }),
    ],
  },
  {
    name: '3. Blog posts - CRUD',
    item: [
      item('Create post', {
        method: 'POST',
        url: '{{baseUrl}}/posts',
        body: validPost,
        tests: [
          statusTest(201),
          test(
            'returns the created post with id and createdAt',
            `const post = pm.response.json().data;\npm.expect(post.id).to.be.a('string');\npm.expect(post.title).to.eql('Understanding REST APIs');\npm.expect(post.createdAt).to.be.a('string');\npm.collectionVariables.set('postId', post.id);`
          ),
          test('has a Location header', `pm.expect(pm.response.headers.get('Location')).to.include('/posts/');`),
        ],
      }),
      item('Create second post (for list tests)', {
        method: 'POST',
        url: '{{baseUrl}}/posts',
        body: {
          title: 'CSS Grid vs Flexbox',
          content: 'Flexbox is one-dimensional while Grid handles two dimensions.',
          author: 'Meera Nair',
          category: 'Frontend',
        },
        tests: [statusTest(201)],
      }),
      item('Get all posts', {
        method: 'GET',
        url: '{{baseUrl}}/posts',
        tests: [
          statusTest(200),
          test(
            'returns a JSON array of posts',
            `const body = pm.response.json();\npm.expect(body.success).to.eql(true);\npm.expect(body.data).to.be.an('array');\npm.expect(body.data.length).to.be.at.least(2);\npm.expect(body.total).to.eql(body.data.length);`
          ),
        ],
      }),
      item('Get all posts - paginated', {
        method: 'GET',
        url: '{{baseUrl}}/posts?page=1&limit=1',
        tests: [
          statusTest(200),
          test(
            'returns one post plus pagination info',
            `const body = pm.response.json();\npm.expect(body.data).to.have.lengthOf(1);\npm.expect(body.page).to.eql(1);\npm.expect(body.limit).to.eql(1);\npm.expect(body.totalPages).to.be.at.least(2);`
          ),
        ],
      }),
      item('Search posts', {
        method: 'GET',
        url: '{{baseUrl}}/posts?search=grid',
        tests: [
          statusTest(200),
          test('only matching posts are returned', `const body = pm.response.json();\npm.expect(body.data.length).to.be.at.least(1);\nbody.data.forEach(p => pm.expect((p.title + p.content + p.author + p.category).toLowerCase()).to.include('grid'));`),
        ],
      }),
      item('Filter posts by category', {
        method: 'GET',
        url: '{{baseUrl}}/posts?category=Frontend',
        tests: [
          statusTest(200),
          test('all posts are in the category', `pm.response.json().data.forEach(p => pm.expect(p.category).to.eql('Frontend'));`),
        ],
      }),
      item('Sort posts by title (descending)', {
        method: 'GET',
        url: '{{baseUrl}}/posts?sort=-title',
        tests: [
          statusTest(200),
          test('titles are in descending order', `const titles = pm.response.json().data.map(p => p.title.toLowerCase());\nconst sorted = [...titles].sort().reverse();\npm.expect(titles).to.eql(sorted);`),
        ],
      }),
      item('Get all posts - invalid page (400)', {
        method: 'GET',
        url: '{{baseUrl}}/posts?page=0',
        tests: [statusTest(400), errorShape],
      }),
      item('Get single post', {
        method: 'GET',
        url: '{{baseUrl}}/posts/{{postId}}',
        tests: [
          statusTest(200),
          test('returns the requested post', `pm.expect(pm.response.json().data.id).to.eql(pm.collectionVariables.get('postId'));`),
        ],
      }),
      item('Get single post - not found (404)', {
        method: 'GET',
        url: '{{baseUrl}}/posts/00000000-0000-4000-8000-000000000000',
        tests: [statusTest(404), errorShape],
      }),
      item('Get single post - invalid id (400)', {
        method: 'GET',
        url: '{{baseUrl}}/posts/not-a-valid-id',
        tests: [statusTest(400), errorShape],
      }),
      item('Update post (PUT) - all fields', {
        method: 'PUT',
        url: '{{baseUrl}}/posts/{{postId}}',
        body: {
          title: 'Understanding REST APIs (updated)',
          content: 'Updated content describing resources, verbs and status codes.',
          category: 'Architecture',
          author: 'Ravi Kumar',
        },
        tests: [
          statusTest(200),
          test(
            'all fields were updated',
            `const post = pm.response.json().data;\npm.expect(post.title).to.eql('Understanding REST APIs (updated)');\npm.expect(post.category).to.eql('Architecture');\npm.expect(post.author).to.eql('Ravi Kumar');`
          ),
        ],
      }),
      item('Update post (PATCH) - single field', {
        method: 'PATCH',
        url: '{{baseUrl}}/posts/{{postId}}',
        body: { category: 'Backend' },
        tests: [
          statusTest(200),
          test('only the category changed', `const post = pm.response.json().data;\npm.expect(post.category).to.eql('Backend');\npm.expect(post.author).to.eql('Ravi Kumar');`),
        ],
      }),
      item('Update post - validation error (400)', {
        method: 'PUT',
        url: '{{baseUrl}}/posts/{{postId}}',
        body: { title: 'x' },
        tests: [statusTest(400), errorShape],
      }),
      item('Update post - empty body (400)', {
        method: 'PUT',
        url: '{{baseUrl}}/posts/{{postId}}',
        body: {},
        tests: [statusTest(400), errorShape],
      }),
      item('Update post - not found (404)', {
        method: 'PUT',
        url: '{{baseUrl}}/posts/00000000-0000-4000-8000-000000000000',
        body: { title: 'Nothing to update' },
        tests: [statusTest(404), errorShape],
      }),
      item('Create post - validation error (400)', {
        method: 'POST',
        url: '{{baseUrl}}/posts',
        body: { title: 'Only a title' },
        tests: [
          statusTest(400),
          errorShape,
          test('lists every missing field', `const fields = pm.response.json().error.details.map(d => d.field).sort();\npm.expect(fields).to.eql(['author', 'category', 'content']);`),
        ],
      }),
      item('Delete post', {
        method: 'DELETE',
        url: '{{baseUrl}}/posts/{{postId}}',
        tests: [
          statusTest(200),
          test('confirms deletion', `const body = pm.response.json();\npm.expect(body.success).to.eql(true);\npm.expect(body.message).to.include('deleted');`),
        ],
      }),
      item('Get deleted post (404)', {
        method: 'GET',
        url: '{{baseUrl}}/posts/{{postId}}',
        tests: [statusTest(404), errorShape],
      }),
      item('Delete post again (404)', {
        method: 'DELETE',
        url: '{{baseUrl}}/posts/{{postId}}',
        tests: [statusTest(404), errorShape],
      }),
    ],
  },
];

// Duplicate-email test tolerates the rate limiter (429) only if the runner is hammering the server.
function statusCodeOrRateLimit(code) {
  return test(`Status code is ${code}`, `pm.response.to.have.status(${code});`);
}

const collection = {
  info: {
    name: 'Blog REST API',
    description:
      'CRUD + JWT auth tests for the Blog REST API. Set the baseUrl variable (default http://localhost:3000) and run the collection top to bottom.',
    schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
  },
  auth: { type: 'bearer', bearer: [{ key: 'token', value: '{{token}}', type: 'string' }] },
  variable: [
    { key: 'baseUrl', value: 'http://localhost:3000' },
    { key: 'token', value: '' },
    { key: 'postId', value: '' },
    { key: 'email', value: '' },
    { key: 'password', value: '' },
  ],
  item: folders,
};

const outDir = path.join(__dirname, '..', 'postman');
fs.mkdirSync(outDir, { recursive: true });
const outFile = path.join(outDir, 'blog-rest-api.postman_collection.json');
fs.writeFileSync(outFile, json(collection) + '\n');
const requestCount = folders.reduce((sum, folder) => sum + folder.item.length, 0);
console.log(`Wrote ${path.relative(process.cwd(), outFile)} (${requestCount} requests)`);
