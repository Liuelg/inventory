import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import process from 'node:process';
import rateLimit from 'express-rate-limit';
import User from '../models/User.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // 20 attempts per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many attempts, please try again later.' },
});

function buildToken(user) {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    throw new Error('JWT_SECRET is not configured');
  }

  const payload = {
    sub: user._id.toString(),
    email: user.email,
    name: user.name,
    role: user.role,
  };

  if (user.store) {
    payload.store = user.store.toString();
  }

  return jwt.sign(payload, jwtSecret, { expiresIn: process.env.JWT_EXPIRES_IN || '1d' });
}

router.post('/register', authMiddleware, async (req, res, next) => {
  try {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ message: 'Only admins can create accounts' });
    }

    const { email, phone, password, name, role, store } = req.body;
    if (!password || !name) {
      return res.status(400).json({ message: 'Name and password are required' });
    }
    if (email && (typeof email !== 'string' || !email.includes('@'))) {
      return res.status(400).json({ message: 'Invalid email' });
    }
    if (typeof password !== 'string' || password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }


    if (phone) {
      const existingPhone = await User.findOne({ phone });
      if (existingPhone) {
        return res.status(400).json({ message: 'Phone number already registered' });
      }
    }

    const allowedRoles = ['sales', 'stock'];
    const userRole = allowedRoles.includes(role) ? role : 'stock';

    const userData = {
      password: await bcrypt.hash(password, 10),
      name,
      role: userRole,
      is_active: true,
    };

    if (email) userData.email = email;
    if (phone) userData.phone = phone;
    if (store && userRole === 'sales') {
      userData.store = store;
    }

    const user = new User(userData);
    await user.save();
    const token = buildToken(user);

    const userResponse = { id: user._id.toString(), email: user.email, phone: user.phone, name: user.name, role: user.role };
    if (user.store) userResponse.store = user.store.toString();
    res.json({ token, user: userResponse });
  } catch (err) {
    // Return 400 for known client errors (validation, duplicates)
    if (err.name === 'ValidationError') {
      return res.status(400).json({ message: err.message });
    }
    if (err.code === 11000) {
      const field = Object.keys(err.keyValue || {}).join(', ') || 'field';
      return res.status(400).json({ message: `A user with that ${field} already exists.` });
    }
    next(err);
  }
});

router.post('/login', authLimiter, async (req, res, next) => {
  try {
    const { identifier, password } = req.body;
    if (!identifier || !password) {
      return res.status(400).json({ message: 'Email or phone and password are required' });
    }
    if (typeof identifier !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ message: 'Invalid credentials format' });
    }

    let user = await User.findOne({ email: identifier });
    if (!user) {
      user = await User.findOne({ phone: identifier });
    }

    if (!user) {
      return res.status(401).json({ message: 'Invalid email, phone or password' });
    }

    if (user.is_active === false) {
      return res.status(403).json({ message: 'Account is inactive. Contact your administrator.' });
    }

    const passwordMatches = await bcrypt.compare(password, user.password);
    if (!passwordMatches) {
      return res.status(401).json({ message: 'Invalid email, phone or password' });
    }

    const token = buildToken(user);

    const userResponse = { id: user._id.toString(), email: user.email, phone: user.phone, name: user.name, role: user.role };
    if (user.store) userResponse.store = user.store.toString();
    res.json({ token, user: userResponse });
  } catch (err) {
    next(err);
  }
});

router.post('/change-password', authMiddleware, async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Current password and new password are required' });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ message: 'New password must be at least 8 characters' });
    }

    const user = await User.findById(req.user.sub);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const passwordMatches = await bcrypt.compare(currentPassword, user.password);
    if (!passwordMatches) {
      return res.status(401).json({ message: 'Current password is incorrect' });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    res.json({ message: 'Password changed successfully' });
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
    const userResponse = { id: user._id.toString(), email: user.email, phone: user.phone, name: user.name, role: user.role };
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
