const express = require('express');
const Post = require('../models/Post');
const Comment = require('../models/Comment');

const router = express.Router();

router.post('/create-post', async (req, res) => {
  try {
    const { userId, content } = req.body;
    if (!userId || !content) {
      return res.status(400).json({ error: 'userId and content are required' });
    }

    const post = new Post({ userId, content, likes: 0 });
    await post.save();

    res.status(201).json(post);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create post' });
  }
});

router.put('/like/:id', async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    // Check if user already liked this post
    const hasLiked = post.likedBy.includes(userId);

    if (hasLiked) {
      // Unlike: remove user from likedBy and decrease likes
      post.likedBy = post.likedBy.filter(id => id.toString() !== userId);
      post.likes = Math.max(0, post.likes - 1);
    } else {
      // Like: add user to likedBy and increase likes
      post.likedBy.push(userId);
      post.likes += 1;
    }

    await post.save();

    res.json({ message: hasLiked ? 'Post unliked' : 'Post liked', likes: post.likes, liked: !hasLiked });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to like post' });
  }
});

router.get('/posts', async (req, res) => {
  try {
    const posts = await Post.find().sort({ createdAt: -1 }).populate('userId', 'username');
    const comments = await Comment.find();
    res.json({ posts, comments });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to load posts' });
  }
});

router.delete('/post/:id', async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const { userId } = req.body;
    if (post.userId.toString() !== userId) {
      return res.status(403).json({ error: 'Cannot delete post from another user' });
    }

    await Post.findByIdAndDelete(req.params.id);
    await Comment.deleteMany({ postId: req.params.id });

    res.json({ message: 'Post deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete post' });
  }
});

router.put('/post/:id', async (req, res) => {
  try {
    const { userId, content } = req.body;
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    if (post.userId.toString() !== userId) {
      return res.status(403).json({ error: 'Cannot edit post from another user' });
    }

    post.content = content;
    await post.save();

    res.json({ message: 'Post updated', post });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update post' });
  }
});

router.post('/repost/:id', async (req, res) => {
  try {
    const { userId } = req.body;
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    if (post.repostedBy.includes(userId)) {
      return res.status(400).json({ error: 'Already reposted this post' });
    }

    post.reposts += 1;
    post.repostedBy.push(userId);
    await post.save();

    res.json({ message: 'Post reposted', reposts: post.reposts });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to repost' });
  }
});

module.exports = router;
