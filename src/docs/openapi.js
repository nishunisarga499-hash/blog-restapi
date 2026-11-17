/**
 * OpenAPI 3 specification, served by Swagger UI at /api-docs
 * (raw JSON at /api-docs.json).
 */
const errorResponse = (description) => ({
  description,
  content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
});

const idParam = {
  name: 'id',
  in: 'path',
  required: true,
  description: 'Blog post id',
  schema: { type: 'string', example: '3f1b6c0e-8a52-4c1e-9d2f-6b7c1e0a4a11' },
};

const securedWrite = [{ bearerAuth: [] }];
const authNote =
  ' When the server runs with `AUTH_REQUIRED=true` this endpoint needs a JWT (use the **Authorize** button).';

const openapi = {
  openapi: '3.0.3',
  info: {
    title: 'Blog REST API',
    version: '1.0.0',
    description:
      'A RESTful API for managing blog posts (Create, Read, Update, Delete) built with Node.js and Express.js. ' +
      'Includes validation, JWT authentication, pagination, search and filtering.',
  },
  servers: [{ url: '/', description: 'Current server' }],
  tags: [
    { name: 'Posts', description: 'CRUD operations for blog posts' },
    { name: 'Auth', description: 'Register / login (JWT)' },
    { name: 'System', description: 'Health and info' },
  ],
  paths: {
    '/posts': {
      post: {
        tags: ['Posts'],
        summary: 'Create a new blog post',
        description: 'Creates a post. `createdAt` is set by the server.' + authNote,
        security: securedWrite,
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/PostInput' } } },
        },
        responses: {
          201: {
            description: 'Post created',
            headers: { Location: { schema: { type: 'string' }, description: 'URL of the new post' } },
            content: { 'application/json': { schema: { $ref: '#/components/schemas/PostResponse' } } },
          },
          400: errorResponse('Validation failed / malformed JSON'),
          401: errorResponse('Missing or invalid token (only when AUTH_REQUIRED=true)'),
        },
      },
      get: {
        tags: ['Posts'],
        summary: 'Get all blog posts',
        description:
          'Returns every post (newest first by default). Add `page` and/or `limit` to paginate; ' +
          'use `search`, `category`, `author`, `sort` and `order` to search, filter and sort.',
        parameters: [
          { name: 'search', in: 'query', schema: { type: 'string' }, description: 'Case-insensitive text search in title, content, author and category' },
          { name: 'category', in: 'query', schema: { type: 'string' }, description: 'Filter by category (case-insensitive, exact)' },
          { name: 'author', in: 'query', schema: { type: 'string' }, description: 'Filter by author name (case-insensitive, exact)' },
          {
            name: 'sort',
            in: 'query',
            schema: { type: 'string', example: '-createdAt' },
            description: 'Field to sort by: createdAt, updatedAt, title, author, category. Prefix with `-` for descending.',
          },
          { name: 'order', in: 'query', schema: { type: 'string', enum: ['asc', 'desc'] }, description: 'Sort direction' },
          { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1 }, description: 'Page number (enables pagination)' },
          { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100 }, description: 'Posts per page (default 10 when paginating, max 100)' },
        ],
        responses: {
          200: {
            description: 'List of posts',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/PostListResponse' } } },
          },
          400: errorResponse('Invalid query parameters'),
        },
      },
    },
    '/posts/{id}': {
      get: {
        tags: ['Posts'],
        summary: 'Get a single blog post',
        parameters: [idParam],
        responses: {
          200: { description: 'The post', content: { 'application/json': { schema: { $ref: '#/components/schemas/PostResponse' } } } },
          400: errorResponse('Invalid id format'),
          404: errorResponse('Post not found'),
        },
      },
      put: {
        tags: ['Posts'],
        summary: 'Update a blog post',
        description:
          'Update title, content, category and/or author. Send only the fields you want to change (at least one).' +
          authNote,
        security: securedWrite,
        parameters: [idParam],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/PostUpdate' } } },
        },
        responses: {
          200: { description: 'Post updated', content: { 'application/json': { schema: { $ref: '#/components/schemas/PostResponse' } } } },
          400: errorResponse('Validation failed / invalid id'),
          401: errorResponse('Missing or invalid token (only when AUTH_REQUIRED=true)'),
          404: errorResponse('Post not found'),
        },
      },
      patch: {
        tags: ['Posts'],
        summary: 'Partially update a blog post',
        description: 'Identical behaviour to PUT.' + authNote,
        security: securedWrite,
        parameters: [idParam],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/PostUpdate' } } },
        },
        responses: {
          200: { description: 'Post updated', content: { 'application/json': { schema: { $ref: '#/components/schemas/PostResponse' } } } },
          400: errorResponse('Validation failed / invalid id'),
          401: errorResponse('Missing or invalid token (only when AUTH_REQUIRED=true)'),
          404: errorResponse('Post not found'),
        },
      },
      delete: {
        tags: ['Posts'],
        summary: 'Delete a blog post',
        description: 'Deletes the post and returns the deleted post.' + authNote,
        security: securedWrite,
        parameters: [idParam],
        responses: {
          200: { description: 'Post deleted', content: { 'application/json': { schema: { $ref: '#/components/schemas/PostResponse' } } } },
          400: errorResponse('Invalid id format'),
          401: errorResponse('Missing or invalid token (only when AUTH_REQUIRED=true)'),
          404: errorResponse('Post not found'),
        },
      },
    },
    '/auth/register': {
      post: {
        tags: ['Auth'],
        summary: 'Register a new user',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/RegisterInput' } } },
        },
        responses: {
          201: { description: 'User created, token returned', content: { 'application/json': { schema: { $ref: '#/components/schemas/AuthResponse' } } } },
          400: errorResponse('Validation failed'),
          409: errorResponse('Email already registered'),
          429: errorResponse('Too many attempts'),
        },
      },
    },
    '/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Log in and receive a JWT',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/LoginInput' } } },
        },
        responses: {
          200: { description: 'Login successful', content: { 'application/json': { schema: { $ref: '#/components/schemas/AuthResponse' } } } },
          400: errorResponse('Validation failed'),
          401: errorResponse('Invalid email or password'),
          429: errorResponse('Too many attempts'),
        },
      },
    },
    '/auth/me': {
      get: {
        tags: ['Auth'],
        summary: 'Get the currently logged-in user',
        security: securedWrite,
        responses: {
          200: {
            description: 'Current user',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: { success: { type: 'boolean', example: true }, data: { $ref: '#/components/schemas/User' } },
                },
              },
            },
          },
          401: errorResponse('Missing or invalid token'),
        },
      },
    },
    '/health': {
      get: {
        tags: ['System'],
        summary: 'Health check',
        responses: {
          200: {
            description: 'Service is up',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'ok' },
                    uptimeSeconds: { type: 'number', example: 12.5 },
                    storage: { type: 'string', example: 'file' },
                    timestamp: { type: 'string', format: 'date-time' },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
    },
    schemas: {
      Post: {
        type: 'object',
        properties: {
          id: { type: 'string', example: '3f1b6c0e-8a52-4c1e-9d2f-6b7c1e0a4a11' },
          title: { type: 'string', example: 'Understanding REST APIs' },
          content: { type: 'string', example: 'REST is an architectural style built around resources and HTTP verbs.' },
          author: { type: 'string', example: 'Asha Rao' },
          category: { type: 'string', example: 'Backend' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      PostInput: {
        type: 'object',
        required: ['title', 'content', 'author', 'category'],
        properties: {
          title: { type: 'string', minLength: 3, maxLength: 150, example: 'Understanding REST APIs' },
          content: { type: 'string', minLength: 10, maxLength: 20000, example: 'REST is an architectural style built around resources and HTTP verbs.' },
          author: { type: 'string', minLength: 2, maxLength: 100, example: 'Asha Rao' },
          category: { type: 'string', minLength: 2, maxLength: 50, example: 'Backend' },
        },
      },
      PostUpdate: {
        type: 'object',
        minProperties: 1,
        properties: {
          title: { type: 'string', minLength: 3, maxLength: 150 },
          content: { type: 'string', minLength: 10, maxLength: 20000 },
          author: { type: 'string', minLength: 2, maxLength: 100 },
          category: { type: 'string', minLength: 2, maxLength: 50 },
        },
      },
      PostResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          message: { type: 'string' },
          data: { $ref: '#/components/schemas/Post' },
        },
      },
      PostListResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          count: { type: 'integer', description: 'Posts in this response', example: 10 },
          total: { type: 'integer', description: 'Posts matching the query (before pagination)', example: 42 },
          page: { type: 'integer', description: 'Only present when paginating', example: 1 },
          limit: { type: 'integer', description: 'Only present when paginating', example: 10 },
          totalPages: { type: 'integer', description: 'Only present when paginating', example: 5 },
          data: { type: 'array', items: { $ref: '#/components/schemas/Post' } },
        },
      },
      RegisterInput: {
        type: 'object',
        required: ['username', 'email', 'password'],
        properties: {
          username: { type: 'string', minLength: 3, maxLength: 30, example: 'asha_rao' },
          email: { type: 'string', format: 'email', example: 'asha@example.com' },
          password: { type: 'string', minLength: 8, maxLength: 72, example: 'S3cure-passw0rd' },
        },
      },
      LoginInput: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email', example: 'asha@example.com' },
          password: { type: 'string', example: 'S3cure-passw0rd' },
        },
      },
      User: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          username: { type: 'string' },
          email: { type: 'string', format: 'email' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      AuthResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          message: { type: 'string' },
          data: {
            type: 'object',
            properties: {
              user: { $ref: '#/components/schemas/User' },
              token: { type: 'string', description: 'JWT - send as `Authorization: Bearer <token>`' },
            },
          },
        },
      },
      Error: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          error: {
            type: 'object',
            properties: {
              status: { type: 'integer', example: 400 },
              message: { type: 'string', example: 'Validation failed' },
              details: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    field: { type: 'string', example: 'title' },
                    message: { type: 'string', example: 'title is required' },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
};

module.exports = openapi;
