const express = require('express');
const Comment = require('../models/Comment');

const router = express.Router();

router.post('/comment', async (req, res) => {
  try {
    const { postId, userId, text } = req.body;
    if (!postId || !userId || !text) {
      return res.status(400).json({ error: 'postId, userId and text are required' });
    }

    const comment = new Comment({ postId, userId, text });
    await comment.save();

    res.status(201).json(comment);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to save comment' });
  }
});

router.get('/comments/post/:postId', async (req, res) => {
  try {
    const comments = await Comment.find({ postId: req.params.postId })
      .populate('userId', 'username profileImage')
      .sort({ createdAt: 1 });
    res.json(comments);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to load comments' });
  }
});

module.exports = router;
