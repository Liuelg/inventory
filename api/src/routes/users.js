import { Router } from 'express';
const router = Router();
import User from '../models/User.js';
import { authMiddleware } from '../middleware/auth.js';

router.post('/', async (req, res) => {
  try {
    const newUser = new User(req.body);
    const savedUser = await newUser.save();
    res.status(201).json(savedUser);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.get('/', async (req, res) => {
  try {
    const users = await User.find().select('-password').populate('store', 'name');
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.patch('/:id', authMiddleware, async (req, res) => {
  try {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ message: 'Only admins can update users' });
    }

    if (req.user.sub === req.params.id) {
      return res.status(400).json({ message: 'You cannot deactivate your own account' });
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    ).select('-password').populate('store', 'name');

    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(updatedUser);
  } catch (err) {
    if (err.kind === 'ObjectId') {
      return res.status(400).json({ message: 'Invalid User ID format' });
    }
    res.status(400).json({ message: err.message });
  }
});

export default router;