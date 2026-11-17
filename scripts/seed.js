/**
 * Seed the configured storage with sample blog posts.
 *
 *   npm run seed            -> adds samples only if there are no posts yet
 *   npm run seed -- --force -> deletes ALL existing posts first, then adds samples
 *
 * With the "file" driver, run this while the API server is STOPPED (the server keeps its own
 * in-memory copy of the file and would overwrite the seeded data on its next write).
 */
require('dotenv').config({ quiet: true });

process.env.JWT_SECRET ||= 'seed-script-does-not-use-jwt';

const { loadConfig } = require('../src/config');
const { createRepositories } = require('../src/repositories');

const SAMPLE_POSTS = [
  {
    title: 'Getting Started with Node.js',
    content: 'Node.js lets you run JavaScript on the server. In this post we set up a project, install packages with npm and run our first script.',
    author: 'Asha Rao',
    category: 'Backend',
  },
  {
    title: 'Understanding REST APIs',
    content: 'REST is an architectural style built around resources and HTTP verbs. We look at URLs, status codes and what makes an API RESTful.',
    author: 'Asha Rao',
    category: 'Backend',
  },
  {
    title: 'Express Middleware Explained',
    content: 'Middleware functions sit between the request and the response. They can log, validate, authenticate or transform data before a route handler runs.',
    author: 'Ravi Kumar',
    category: 'Backend',
  },
  {
    title: 'CSS Grid vs Flexbox',
    content: 'Flexbox is great for one-dimensional layouts while Grid shines in two dimensions. Here is how to decide which one to reach for.',
    author: 'Meera Nair',
    category: 'Frontend',
  },
  {
    title: 'Why Validation Matters',
    content: 'Never trust client input. Validating request bodies protects your database and gives API consumers clear, actionable error messages.',
    author: 'Ravi Kumar',
    category: 'Security',
  },
  {
    title: 'A Beginner Guide to MongoDB',
    content: 'MongoDB stores data as flexible JSON-like documents. We create a database, insert documents and run our first queries with Mongoose.',
    author: 'Meera Nair',
    category: 'Database',
  },
];

async function main() {
  const force = process.argv.includes('--force');
  const config = loadConfig();
  const repositories = await createRepositories(config);

  try {
    const { total } = await repositories.posts.list({});
    if (total > 0 && !force) {
      console.log(`Storage already has ${total} post(s). Use "npm run seed -- --force" to replace them.`);
      return;
    }
    if (force) await repositories.posts.clear();

    for (const post of SAMPLE_POSTS) {
      await repositories.posts.create(post);
    }
    console.log(`Seeded ${SAMPLE_POSTS.length} sample posts into the "${config.storageDriver}" storage.`);
  } finally {
    await repositories.close();
  }
}

main().catch((err) => {
  console.error('Seeding failed:', err.message);
  process.exit(1);
});
