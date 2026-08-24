import { Router } from 'express'
import Stock from '../models/Stock.js'
import Product from '../models/Products.js'

const router = Router()

router.post('/', async (req, res, next) => {
  try {
    const body = req.body

    const items = await Promise.all(body.items.map(async (i) => {
      const product = await Product.findById(i.item_id)
      const price = i.price ?? product?.price?.amount ?? 0
      return {
        item_id: i.item_id,
        quantity: i.quantity,
        remaining: i.remaining ?? i.quantity,
        price,
        group: i.group || null,
      }
    }))

    const totalAmount = items.reduce((sum, i) => sum + (i.quantity * i.price), 0)

    const stock = new Stock({
      created_by: body.created_by,
      date: body.date,
      items,
      totalAmount,
      description: body.description,
      note: body.note,
    })
    await stock.save()
    await stock.populate({
      path: 'items.item_id',
      populate: { path: 'category', select: 'name' }
    })
    await stock.populate('created_by', 'name email')
    res.status(201).json(stock)
  } catch (err) {
    next(err)
  }
})

router.get('/', async (req, res, next) => {
  try {
    const stocks = await Stock.find()
      .populate({
        path: 'items.item_id',
        populate: { path: 'category', select: 'name' }
      })
      .populate('created_by', 'name email')
      .sort({ createdAt: -1 })
    res.json(stocks)
  } catch (err) {
    next(err)
  }
})

router.get('/:id', async (req, res, next) => {
  try {
    const stock = await Stock.findById(req.params.id)
      .populate({
        path: 'items.item_id',
        populate: { path: 'category', select: 'name' }
      })
      .populate('created_by', 'name email')
    if (!stock) {
      return res.status(404).json({ message: 'Stock entry not found' })
    }
    res.json(stock)
  } catch (err) {
    next(err)
  }
})

router.patch('/:id', async (req, res, next) => {
  try {
    const body = req.body
    const update = {}

    if (body.date !== undefined) update.date = body.date
    if (body.description !== undefined) update.description = body.description
    if (body.note !== undefined) update.note = body.note

    if (body.items !== undefined) {
      const items = await Promise.all(body.items.map(async (i) => {
        const product = await Product.findById(i.item_id)
        const price = i.price ?? product?.price?.amount ?? 0
        return {
          item_id: i.item_id,
          quantity: i.quantity,
          remaining: i.remaining ?? i.quantity,
          price,
          group: i.group || null,
        }
      }))
      update.items = items
      update.totalAmount = items.reduce((sum, i) => sum + (i.quantity * i.price), 0)
    }

    const stock = await Stock.findByIdAndUpdate(
      req.params.id,
      { $set: update },
      { new: true, runValidators: true }
    )
      .populate({
        path: 'items.item_id',
        populate: { path: 'category', select: 'name' }
      })
      .populate('created_by', 'name email')

    if (!stock) {
      return res.status(404).json({ message: 'Stock entry not found' })
    }
    res.json(stock)
  } catch (err) {
    next(err)
  }
})

router.delete('/:id', async (req, res, next) => {
  try {
    const stock = await Stock.findByIdAndDelete(req.params.id)
    if (!stock) {
      return res.status(404).json({ message: 'Stock entry not found' })
    }
    res.json({ message: 'Stock entry deleted successfully' })
  } catch (err) {
    next(err)
  }
})

// Get available stock per product (sum of remaining across all stock records)
router.get('/available', async (req, res, next) => {
  try {
    const stocks = await Stock.find()

    const availableMap = new Map()

    for (const stock of stocks) {
      for (const item of stock.items || []) {
        const productId = item.item_id?.toString?.()
        if (!productId) continue

        const remaining = item.remaining || 0
        const existing = availableMap.get(productId) || 0
        availableMap.set(productId, existing + remaining)
      }
    }

    // Convert to array and populate product names
    const productIds = Array.from(availableMap.keys())
    const Products = (await import('../models/Products.js')).default
    const products = await Products.find({ _id: { $in: productIds } }).select('name')

    const data = productIds.map((productId) => {
      const product = products.find((p) => p._id.toString() === productId)
      return {
        product: {
          _id: productId,
          name: product?.name || 'Unknown Product',
        },
        available: availableMap.get(productId),
      }
    }).filter((item) => item.available > 0)
      .sort((a, b) => b.available - a.available)

    res.json({ success: true, data })
  } catch (err) {
    next(err)
  }
})

export default router
