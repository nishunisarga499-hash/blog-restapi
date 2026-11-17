/**
 * /posts routes - RESTful resource routes for blog posts.
 *
 *   POST   /posts        create
 *   GET    /posts        list (search / filter / sort / pagination)
 *   GET    /posts/:id    read one
 *   PUT    /posts/:id    update (partial updates allowed)
 *   PATCH  /posts/:id    update (same behaviour as PUT)
 *   DELETE /posts/:id    delete
 *
 * Write routes go through `protectWrites` (JWT required when AUTH_REQUIRED=true).
 */
const express = require('express');
const createPostController = require('../controllers/postController');

function createPostRoutes({ postsRepo, protectWrites }) {
  const router = express.Router();
  const ctrl = createPostController(postsRepo);

  router.route('/').get(ctrl.listPosts).post(protectWrites, ctrl.createPost);

  router
    .route('/:id')
    .get(ctrl.getPost)
    .put(protectWrites, ctrl.updatePost)
    .patch(protectWrites, ctrl.updatePost)
    .delete(protectWrites, ctrl.deletePost);

  return router;
}

module.exports = createPostRoutes;
