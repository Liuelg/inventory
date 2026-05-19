import { Router } from 'express';
import SubCategory from '../models/SubCategory.js';

const router = Router();

function formatSubCategory(doc) {
  const obj = doc.toObject();
  const categoryObj = obj.category && typeof obj.category === 'object'
    ? obj.category
    : null;

  return {
    _id: obj._id.toString(),
    name: obj.name,
    categoryId: categoryObj
      ? categoryObj._id.toString()
      : obj.category?.toString?.() || '',
    createdAt: obj.createdAt,
    category: categoryObj
      ? {
          _id: categoryObj._id.toString(),
          name: categoryObj.name,
          createdAt: categoryObj.createdAt,
        }
      : undefined,
  };
}

router.get('/', async (req, res, next) => {
  try {
    const subCategories = await SubCategory.find().populate('category').sort({ createdAt: -1 });
    res.json({ success: true, data: subCategories.map(formatSubCategory) });
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const { name, categoryId } = req.body;
    const subCategory = new SubCategory({ name, category: categoryId });
    await subCategory.save();
    await subCategory.populate('category');
    res.status(201).json({ success: true, data: formatSubCategory(subCategory) });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const subCategory = await SubCategory.findById(req.params.id).populate('category');
    if (!subCategory) {
      return res.status(404).json({ success: false, message: 'SubCategory not found' });
    }
    res.json({ success: true, data: formatSubCategory(subCategory) });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const { name, categoryId } = req.body;
    const subCategory = await SubCategory.findByIdAndUpdate(
      req.params.id,
      { name, category: categoryId },
      { new: true, runValidators: true }
    ).populate('category');
    if (!subCategory) {
      return res.status(404).json({ success: false, message: 'SubCategory not found' });
    }
    res.json({ success: true, data: formatSubCategory(subCategory) });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const subCategory = await SubCategory.findByIdAndDelete(req.params.id);
    if (!subCategory) {
      return res.status(404).json({ success: false, message: 'SubCategory not found' });
    }
    res.json({ success: true, data: formatSubCategory(subCategory) });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.get('/category/:categoryId', async (req, res, next) => {
  try {
    const subCategories = await SubCategory.find({ category: req.params.categoryId })
      .populate('category')
      .sort({ createdAt: -1 });
    res.json({ success: true, data: subCategories.map(formatSubCategory) });
  } catch (err) {
    next(err);
  }
});

export default router;
