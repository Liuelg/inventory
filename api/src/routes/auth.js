import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import process from 'node:process';
import User from '../models/User.js';

const router = Router();

function buildToken(user) {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    throw new Error('JWT_SECRET is not configured');
  }

  const payload = {
    sub: user._id.toString(),
    email: user.email,
    role: user.role,
  };

  if (user.store) {
    payload.store = user.store.toString();
  }

  return jwt.sign(payload, jwtSecret, { expiresIn: process.env.JWT_EXPIRES_IN || '1d' });
}

router.post('/register', async (req, res, next) => {
  try {
    const { email, password, name, role, store } = req.body;
    if (!email || !password || !name) {
      return res.status(400).json({ message: 'Name, email and password are required' });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    const allowedRoles = ['admin', 'sales', 'stock'];
    const userRole = allowedRoles.includes(role) ? role : 'stock';

    const userData = {
      email,
      password: await bcrypt.hash(password, 10),
      name,
      role: userRole,
      is_active: true,
    };

    if (store && userRole === 'sales') {
      userData.store = store;
    }

    const user = new User(userData);
    await user.save();
    const token = buildToken(user);

    const userResponse = { id: user._id.toString(), email: user.email, name: user.name, role: user.role };
    if (user.store) userResponse.store = user.store.toString();
    res.json({ token, user: userResponse });
  } catch (err) {
    next(err);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const passwordMatches = await bcrypt.compare(password, user.password);
    if (!passwordMatches) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const token = buildToken(user);

    const userResponse = { id: user._id.toString(), email: user.email, name: user.name, role: user.role };
    if (user.store) userResponse.store = user.store.toString();
    res.json({ token, user: userResponse });
  } catch (err) {
    next(err);
  }
});

router.get('/me', async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ')
      ? authHeader.slice(7)
      : '';
    if (!token) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new Error('JWT_SECRET is not configured');
    }

    const decoded = jwt.verify(token, jwtSecret);
    if (typeof decoded === 'string' || !decoded.sub) {
      return res.status(401).json({ message: 'Invalid token' });
    }

    const userId = decoded.sub;
    const user = await User.findById(userId).select('-password');
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }
    const userResponse = { id: user._id.toString(), email: user.email, name: user.name, role: user.role };
    if (user.store) userResponse.store = user.store.toString();
    res.json({ user: userResponse });
  } catch (err) {
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Invalid or expired token' });
    }

    next(err);
  }
});

export default router;
