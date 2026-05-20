const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Post = require('../models/Post');

const router = express.Router();

router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'username, email and password are required' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ username, email, password: hashedPassword, followers: [], following: [] });
    await user.save();

    res.status(201).json({ id: user._id, username: user.username, email: user.email });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to register user' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET || 'supersecret', {
      expiresIn: '7d',
    });

    res.json({ user: { id: user._id, username: user.username, email: user.email }, token });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to login user' });
  }
});

router.put('/follow/:id', async (req, res) => {
  try {
    const followerId = req.body.followerId;
    const user = await User.findById(req.params.id);
    const follower = await User.findById(followerId);

    if (!user || !follower) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user._id.equals(follower._id)) {
      return res.status(400).json({ error: 'Cannot follow yourself' });
    }

    if (user.followers.includes(followerId)) {
      return res.status(400).json({ error: 'Already following this user' });
    }

    user.followers.push(followerId);
    follower.following.push(user._id);

    await user.save();
    await follower.save();

    res.json({ message: 'User Followed' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to follow user' });
  }
});

router.get('/user/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const posts = await Post.find({ userId: user._id }).sort({ createdAt: -1 });
    res.json({ user, posts });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to load profile' });
  }
});

router.get('/users', async (req, res) => {
  try {
    const users = await User.find().select('username profileImage bio followers following createdAt');
    res.json(users);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to load users' });
  }
});

router.put('/user/:id/profile-image', async (req, res) => {
  try {
    const { imageData } = req.body;
    if (!imageData) {
      return res.status(400).json({ error: 'Image data is required' });
    }

    const user = await User.findByIdAndUpdate(req.params.id, { profileImage: imageData }, { new: true });
    res.json({ message: 'Profile image updated', user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update profile image' });
  }
});

module.exports = router;
