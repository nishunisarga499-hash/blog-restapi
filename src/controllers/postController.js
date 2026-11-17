/**
 * Blog post controller - the CRUD request handlers.
 *
 * Handlers are thin: validate -> call the repository -> send JSON.
 * Express 5 forwards rejected promises to the error middleware automatically,
 * so there is no try/catch boilerplate.
 */
const ApiError = require('../utils/ApiError');
const { validatePostPayload } = require('../validators/postValidator');
const { validateListQuery } = require('../validators/queryValidator');

function createPostController(postsRepo) {
  function assertValidId(id) {
    if (!postsRepo.isValidId(id)) {
      throw ApiError.badRequest(`Invalid post id "${id}"`);
    }
  }

  // POST /posts  -> 201 Created
  async function createPost(req, res) {
    const data = validatePostPayload(req.body);
    const post = await postsRepo.create(data);

    res
      .status(201)
      .location(`/posts/${post.id}`)
      .json({ success: true, message: 'Blog post created successfully', data: post });
  }

  // GET /posts  -> 200 (supports search, filter, sort, pagination)
  async function listPosts(req, res) {
    const query = validateListQuery(req.query);
    const result = await postsRepo.list(query);

    const body = { success: true, count: result.items.length, total: result.total };
    if (result.page !== undefined) {
      body.page = result.page;
      body.limit = result.limit;
      body.totalPages = result.totalPages;
    }
    body.data = result.items;

    res.status(200).json(body);
  }

  // GET /posts/:id  -> 200 or 404
  async function getPost(req, res) {
    assertValidId(req.params.id);
    const post = await postsRepo.getById(req.params.id);
    if (!post) throw ApiError.notFound(`Blog post with id "${req.params.id}" not found`);

    res.status(200).json({ success: true, data: post });
  }

  // PUT|PATCH /posts/:id  -> 200 or 404 (title, content, category and/or author)
  async function updatePost(req, res) {
    assertValidId(req.params.id);
    const changes = validatePostPayload(req.body, { partial: true });
    const post = await postsRepo.update(req.params.id, changes);
    if (!post) throw ApiError.notFound(`Blog post with id "${req.params.id}" not found`);

    res.status(200).json({ success: true, message: 'Blog post updated successfully', data: post });
  }

  // DELETE /posts/:id  -> 200 or 404
  async function deletePost(req, res) {
    assertValidId(req.params.id);
    const post = await postsRepo.remove(req.params.id);
    if (!post) throw ApiError.notFound(`Blog post with id "${req.params.id}" not found`);

    res.status(200).json({ success: true, message: 'Blog post deleted successfully', data: post });
  }

  return { createPost, listPosts, getPost, updatePost, deletePost };
}

module.exports = createPostController;
