import { Router } from 'express';
import Goodin from '../models/Goodin.js';
const router = Router();

router.post('/', async (req, res) => {
  try {
    const goodIn = new Goodin(req.body);
    const savedGoodIn = await goodIn.save();
    res.status(201).json(savedGoodIn);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.get('/', async (req, res) => {
  try {
    const goods = await Goodin.find()
      .populate('store')
      .populate('created_by', 'name email')
      .populate('user', 'name email');
    res.json(goods);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const goodIn = await Goodin.findById(req.params.id)
      .populate('store')
      .populate('created_by', 'name email')
      .populate('user', 'name email');

    if (!goodIn) {
      return res.status(404).json({ message: 'Goodin record not found' });
    }

    res.json(goodIn);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.patch('/:id', async (req, res) => {
  try {
    const updatedGoodIn = await Goodin.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    ).populate('product');

    if (!updatedGoodIn) {
      return res.status(404).json({ message: 'Goodin record not found' });
    }

    res.json(updatedGoodIn);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const deletedGoodIn = await Goodin.findByIdAndDelete(req.params.id);

    if (!deletedGoodIn) {
      return res.status(404).json({ message: 'Goodin record not found' });
    }

    res.json({ message: 'Goodin record deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;