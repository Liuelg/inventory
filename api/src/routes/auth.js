import { Router } from 'express';
import crypto from 'crypto';
import User from '../models/User.js';

const router = Router();

const tokenStore = new Map();

router.post('/register', async (req, res, next) => {
  try {
    const { email, password, name } = req.body;
    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ message: 'Email already registered' });
    }
    const user = new User({ email, password, name, role: 'staff', is_active: true });
    await user.save();
    const token = crypto.randomUUID();
    tokenStore.set(token, user._id.toString());
    res.json({
      token,
      user: { id: user._id.toString(), email: user.email, name: user.name, role: user.role },
    });
  } catch (err) {
    next(err);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user || user.password !== password) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }
    const token = crypto.randomUUID();
    tokenStore.set(token, user._id.toString());
    res.json({
      token,
      user: { id: user._id.toString(), email: user.email, name: user.name, role: user.role },
    });
  } catch (err) {
    next(err);
  }
});

router.get('/me', async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    const userId = tokenStore.get(token);
    if (!userId) {
      return res.status(401).json({ message: 'Invalid token' });
    }
    const user = await User.findById(userId).select('-password');
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }
    res.json({
      user: { id: user._id.toString(), email: user.email, name: user.name, role: user.role },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
