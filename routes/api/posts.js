const express = require("express");
const { check, validationResult } = require("express-validator");
const auth = require("../../middleware/auth");
const router = express.Router();

const Post = require("../../models/Posts");
const Profile = require("../../models/Profile");
const User = require("../../models/User");

// @route       POST api/posts
// @desc        Create a post
// @access      Private
router.post(
  "/",
  [auth, check("text", "Post text is required").not().isEmpty()],
  async (req, res) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const user = await User.findById(req.user.id).select("-password");

      const newPost = {
        text: req.body.text,
        name: user.name,
        avatar: user.avatar,
        user: req.user.id,
      };

      const post = new Post(newPost);

      await post.save();

      res.status(200).json(post);
    } catch (err) {
      console.error(err);
      res.status(500).json({ msg: err.message });
    }
  }
);

// @route       GET api/posts
// @desc        Get all posts
// @access      Private         // Private because in the front end,,, youll need to be logged in to even see the posts
router.get("/", auth, async (req, res) => {
  try {
    const allPosts = await Post.find({}).sort({ date: -1 });
    res.status(200).json(allPosts);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ msg: "Server error" });
  }
});

// @route       GET api/posts/:id
// @desc        Get post by ID
// @access      Private
router.get("/:id", auth, async (req, res) => {
  try {
    const post = await Post.find({ _id: req.params.id });

    if (!post) {
      return res.status(404).json({ msg: "post not found" });
    }

    res.status(200).json(post);
  } catch (err) {
    if (err.kind === "ObjectId") {
      return res.status(400).json({ msg: "Bad request" });
    }
    console.log(err.message);
    res.status(500).json({ msg: "Server error" });
  }
});

// @route       GET api/posts/:user_id
// @desc        Get all all posts for user with id
// @access      Private
router.get("/:user_id", auth, async (req, res) => {
  try {
    const user = await User.findById(req.params.user_id);
    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }
    const userPosts = await Post.find({ user: req.params.user_id });

    res.status(200).json(userPosts);
  } catch (err) {
    if (err.kind === "ObjectId") {
      return res.status(400).json({ msg: "Bad request" });
    }
    console.error(err.message);
    res.status(500).json({ msg: "Server error" });
  }
});

// @route       DELETE api/posts/:id
// @desc        Delete a post by id
// @access      Private
router.delete("/:id", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ msg: "Post not found" });
    }
    if (user._id.toString() !== post.user.toString()) {
      return res.status(401).json({ msg: "Unauthorized access" });
    }

    await Post.findByIdAndDelete(req.params.id);
    res.status(200).json({ msg: "Post successfully deleted" });
  } catch (err) {
    console.log(err.name);
    if (err.kind === "ObjectId") {
      return res.status(400).json({ msg: "Bad request" });
    }
    console.error(err.message);
    res.status(500).json({ msg: "Server error" });
  }
});

// @route       PUT api/posts/like/:id
// @desc        Like / Unlike a post
// @access      Private
router.put("/like/:id", auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ msg: "Post not found" });
    }

    if (
      post.likes.some((user) => user.user.toString() === req.user.id.toString())
    ) {
      // This means the user already liked this post so we gotta unlike it.
      post.likes = post.likes.filter(
        (user) => user.user.toString() !== req.user.id.toString()
      );
    } else {
      post.likes.push({ user: req.user.id });
    }

    await post.save();

    res.status(200).json(post);
  } catch (err) {
    if (err.kind === "ObjectId") {
      return res.status(400).json({ msg: "Bad request" });
    }
    console.error(err.message);
    res.status(500).json({ msg: "Server error" });
  }
});

// @route       POST api/posts/comment/:id
// @desc        Comment on a post
// @access      Private
router.post(
  "/comment/:id",
  [auth, check("text", "Post text is required").not().isEmpty()],
  async (req, res) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const post = await Post.findById(req.params.id);

      if (!post) {
        return res.status(404).json({ msg: "Post not found" });
      }

      const user = await User.findById(req.user.id);
      if (!user) {
        return res.status(404).json({ msg: "User not found" });
      }

      const newComment = {
        user: user.id,
        text: req.body.text,
        name: user.name,
        avatar: user.avatar,
      };

      post.comments.unshift(newComment);

      await post.save();
      res.status(200).json(post);
    } catch (err) {
      if (err.kind === "ObjectId") {
        return res.status(400).json({ msg: "Bad request" });
      }
      console.error(err.message);
      res.status(500).json({ msg: "Server error" });
    }
  }
);

// @route       DELETE api/posts/comment/:pid/:cid
// @desc        Delete a comment on a post
// @access      Private
router.delete("/comment/:pid/:cid", auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.pid);

    if (!post) {
      return res.status(404).json({ msg: "Post not found" });
    }

    const comment = post.comments.find((c) => c.id === req.params.cid);

    if (!comment) {
      return res.status(404).json({ msg: "Comment not found" });
    }

    // Checking if the user who's trying to delete the comment is the owner of the comment or owner of the post
    if (
      req.user.id !== post.user.toString() &&
      comment.user.toString() !== req.user.id
    ) {
      return res.status(401).json({ msg: "Unauthorized access" });
    }

    post.comments = post.comments.filter(
      (comment) => comment.id !== req.params.cid
    );
    await post.save();

    res.status(200).json(post);
  } catch (err) {
    if (err.kind === "ObjectId") {
      return res.status(400).json({ msg: "Bad request" });
    }
    console.error(err.message);
    res.status(500).json({ msg: "Server error" });
  }
});

module.exports = router;
