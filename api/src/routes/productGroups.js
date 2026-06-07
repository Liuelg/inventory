import { Router } from 'express'
import ProductGroup from '../models/ProductGroup.js'
import Product from '../models/Products.js'

const router = Router()

async function resolveGroupItems(items, groupCategory, groupSubCategory) {
  const resolved = []
  for (const item of items || []) {
    if (item.product) {
      // Existing product reference
      resolved.push({ product: item.product, quantity: item.quantity })
    } else if (item.name) {
      // Create a new product from the name
      const existing = await Product.findOne({ name: item.name.trim() })
      if (existing) {
        resolved.push({ product: existing._id, quantity: item.quantity })
      } else {
        const newProduct = new Product({
          name: item.name.trim(),
          category: groupCategory || undefined,
          subCategory: groupSubCategory || undefined,
          price: { amount: 0, currency: 'USD' },
        })
        await newProduct.save()
        resolved.push({ product: newProduct._id, quantity: item.quantity })
      }
    }
  }
  return resolved
}

router.post('/', async (req, res, next) => {
  try {
    const resolvedItems = await resolveGroupItems(
      req.body.items,
      req.body.category,
      req.body.subCategory
    )

    const group = new ProductGroup({
      ...req.body,
      items: resolvedItems,
    })
    await group.save()
    await group.populate('items.product', 'name price image')
    await group.populate('category', 'name')
    await group.populate('subCategory', 'name')
    res.status(201).json(group)
  } catch (err) {
    next(err)
  }
})

router.get('/', async (req, res, next) => {
  try {
    const groups = await ProductGroup.find()
      .populate('items.product', 'name price image')
      .populate('category', 'name')
      .populate('subCategory', 'name')
      .sort({ createdAt: -1 })
    res.json(groups)
  } catch (err) {
    next(err)
  }
})

router.get('/:id', async (req, res, next) => {
  try {
    const group = await ProductGroup.findById(req.params.id)
      .populate('items.product', 'name price image')
      .populate('category', 'name')
      .populate('subCategory', 'name')

    if (!group) {
      return res.status(404).json({ message: 'Product group not found' })
    }

    res.json(group)
  } catch (err) {
    next(err)
  }
})

router.put('/:id', async (req, res, next) => {
  try {
    let update = { ...req.body }

    if (req.body.items) {
      const resolvedItems = await resolveGroupItems(
        req.body.items,
        req.body.category,
        req.body.subCategory
      )
      update.items = resolvedItems
    }

    const group = await ProductGroup.findByIdAndUpdate(
      req.params.id,
      update,
      { new: true, runValidators: true }
    )
      .populate('items.product', 'name price image')
      .populate('category', 'name')
      .populate('subCategory', 'name')

    if (!group) {
      return res.status(404).json({ message: 'Product group not found' })
    }

    res.json(group)
  } catch (err) {
    next(err)
  }
})

router.delete('/:id', async (req, res, next) => {
  try {
    const group = await ProductGroup.findByIdAndDelete(req.params.id)
    if (!group) {
      return res.status(404).json({ message: 'Product group not found' })
    }
    res.json({ message: 'Product group deleted successfully' })
  } catch (err) {
    next(err)
  }
})

export default router
