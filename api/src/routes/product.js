import { Router } from "express"
import Product from '../models/Products.js';

const router = Router()

router.post('/', async (req, res) => {
  try {
    const body = { ...req.body };
    // Only admins can set prices
    if (req.user?.role !== 'admin') {
      delete body.price;
      delete body.previous_prices;
    }
    const newProduct = new Product(body);
    const savedProduct = await newProduct.save();
    return res.status(201).json(savedProduct);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.get('/', async (req, res) => {
  try {
    const products = await Product.find().populate('category').populate('subCategory');
    return res.json(products);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    console.log({
      id: req.params.id
    })
    const product = await Product.findById(req.params.id).populate('category').populate('subCategory');
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    return res.json(product);
  } catch (err) {
    if (err.kind === 'ObjectId') {
      return res.status(400).json({ message: 'Invalid Product ID format' });
    }
    res.status(500).json({ message: err.message });
  }
});

router.patch('/:id', async (req, res) => {
  try {
    const body = { ...req.body };
    // Only admins can update prices
    if (req.user?.role !== 'admin') {
      delete body.price;
      delete body.previous_prices;
    }
    const updatedProduct = await Product.findByIdAndUpdate(
      req.params.id,
      { $set: body },
      {
        new: true,
        runValidators: true
      }
    );

    if (!updatedProduct) {
      return res.status(404).json({ message: 'Product not found' });
    }

    res.json(updatedProduct);
  } catch (err) {
    if (err.kind === 'ObjectId') {
      return res.status(400).json({ message: 'Invalid Product ID format' });
    }
    res.status(400).json({ message: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ message: 'Only admins can delete products' });
    }
    const deletedProduct = await Product.findByIdAndDelete(req.params.id);

    if (!deletedProduct) {
      return res.status(404).json({ message: 'Product not found' });
    }

    res.json({ message: 'Product deleted successfully', deletedProduct });
  } catch (err) {
    if (err.kind === 'ObjectId') {
      return res.status(400).json({ message: 'Invalid Product ID format' });
    }
    res.status(500).json({ message: err.message });
  }
});

export default router;