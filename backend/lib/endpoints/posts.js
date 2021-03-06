const httpErrors = require("http-errors");

const {
  getPostsSchema,
  getPostByIdSchema,
  createPostSchema,
  deletePostSchema,
  updatePostSchema,
  addCommentSchema,
} = require("./schema/posts");

/*
 * /api/posts
 */
async function routes(app) {
  const Post = app.mongo.model("Post");
  const Comment = app.mongo.model("Comment");

  // /posts

  app.get(
    "/",
    { preValidation: [app.authenticate], schema: getPostsSchema },
    async (req, reply) => {
      const { authorId } = req.params;
      const filter = authorId ? { authorId: req.params.authorId } : {};
      const sortedPosts = await Post.find(filter).sort({ date: -1 });
      return reply.send(sortedPosts);
    },
  );

  app.post(
    "/",
    { preValidation: [app.authenticate], schema: createPostSchema },
    async (req) => {
      // todo add logged in user from jwt
      req.body.authorId = ""; // req.user.id;
      return new Post(req.body).save();
    },
  );

  // /posts/postId

  app.get(
    "/:postId",
    { preValidation: [app.authenticate], schema: getPostByIdSchema },
    async (req, reply) => {
      const post = await Post.findById(req.params.postId);
      if (post === null) {
        return reply.send(new httpErrors.NotFound());
      }
      return post;
    },
  );

  app.delete(
    "/:postId",
    { preValidation: [app.authenticate], schema: deletePostSchema },
    async (req) => {
      // todo: make sure user can only delete their own posts
      return Post.findByIdAndRemove(req.params.postId);
    },
  );

  app.patch(
    "/:postId",
    { preValidation: [app.authenticate], schema: updatePostSchema },
    async (req, reply) => {
      // todo: make sure user can only update their own post
      const post = await Post.findById(req.params.postId);
      if (post === null) {
        return reply.send(new httpErrors.NotFound());
      }
      Object.keys(req.body).forEach((key) => {
        if (post[key] && post[key] !== req.body[key]) {
          post[key] = req.body[key];
        }
      });
      return post.save();
    },
  );

  app.post(
    "/:postId/comment",
    { preValidation: [app.authenticate], schema: addCommentSchema },
    async (req) => {
      const { postId } = req.params;
      // todo: get user id from JWT
      //  check if user is authorized to comment (depending on visibility for that post too)
      req.body.authorId = "";
      req.body.postId = postId;
      const newComment = await new Comment(req.body).save();
      const updatedPost = await Post.findOneAndUpdate(
        { _id: postId },
        { $push: { comments: newComment } },
        { new: true },
      );
      return updatedPost;
    },
  );
}

module.exports = routes;
