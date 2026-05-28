import { Router } from 'express'
import mongoose from 'mongoose'
import Stockout from '../models/Stockout.js'
import Store from '../models/Stores.js'
import Stock from '../models/Stock.js'
import Product from '../models/Products.js'

const router = Router()

// Helper to merge items into a store's inventory
async function addItemsToStore(storeId, items) {
  const store = await Store.findById(storeId)
  if (!store) {
    throw new Error('Store not found')
  }

  for (const incoming of items) {
    const existing = store.items.find(
      (i) => i.item_id.toString() === incoming.item_id.toString()
    )

    if (existing) {
      existing.quantity += incoming.quantity
      existing.price = incoming.price
    } else {
      store.items.push({
        item_id: incoming.item_id,
        quantity: incoming.quantity,
        price: incoming.price
      })
    }
  }

  await store.save()
  return store
}

// Helper to get available stock per product
async function getAvailableStock() {
  const stocks = await Stock.find()
  const availableMap = new Map()

  for (const stock of stocks) {
    for (const item of stock.items || []) {
      const productId = item.item_id?.toString?.()
      if (!productId) continue
      const remaining = item.remaining || 0
      availableMap.set(productId, (availableMap.get(productId) || 0) + remaining)
    }
  }

  return availableMap
}

// Helper to deduct stock (FIFO)
async function deductStock(items) {
  for (const { item_id: productId, quantity: requestedQty } of items) {
    let remainingToDeduct = requestedQty

    const stocks = await Stock.find({ 'items.item_id': new mongoose.Types.ObjectId(productId) })
      .sort({ date: 1, createdAt: 1 })

    for (const stock of stocks) {
      if (remainingToDeduct <= 0) break

      for (const item of stock.items) {
        if (item.item_id.toString() !== productId) continue
        if (remainingToDeduct <= 0) break

        const deduct = Math.min(item.remaining, remainingToDeduct)
        item.remaining -= deduct
        remainingToDeduct -= deduct
      }

      await stock.save()
    }

    if (remainingToDeduct > 0) {
      throw new Error(`Insufficient stock for product ${productId}`)
    }
  }
}

// Helper to restore stock when stockout is deleted or updated (reverse FIFO)
async function restoreStock(items) {
  for (const { item_id: productId, quantity } of items) {
    let remainingToRestore = quantity

    const stocks = await Stock.find({ 'items.item_id': new mongoose.Types.ObjectId(productId) })
      .sort({ date: -1, createdAt: -1 })

    for (const stock of stocks) {
      if (remainingToRestore <= 0) break

      for (const item of stock.items) {
        if (item.item_id.toString() !== productId) continue
        if (remainingToRestore <= 0) break

        const restoreQty = Math.min(item.quantity - item.remaining, remainingToRestore)
        item.remaining += restoreQty
        remainingToRestore -= restoreQty
      }

      await stock.save()
    }
  }
}

// Create a stockout (stock controllers)
router.post('/', async (req, res, next) => {
  try {
    const body = req.body
    const items = await Promise.all(body.items.map(async (i) => {
      const product = await Product.findById(i.item_id)
      const price = product?.price?.amount ?? 0
      return {
        item_id: i.item_id,
        quantity: i.quantity,
        price,
      }
    }))

    // Validate available stock
    const availableMap = await getAvailableStock()
    const insufficient = []

    for (const item of items) {
      const productId = item.item_id.toString()
      const available = availableMap.get(productId) || 0
      if (item.quantity > available) {
        insufficient.push({ productId, requested: item.quantity, available })
      }
    }

    if (insufficient.length > 0) {
      const details = insufficient.map((i) =>
        `Requested ${i.requested} but only ${i.available} available`
      ).join('; ')
      return res.status(400).json({
        success: false,
        message: `Insufficient stock: ${details}`
      })
    }

    // Deduct stock
    await deductStock(items)

    const stockout = new Stockout({
      created_by: body.created_by,
      date: body.date,
      store: body.store,
      items,
      note: body.note
    })
    await stockout.save()
    await stockout.populate('items.item_id', 'name category')
    await stockout.populate('store', 'name address')
    await stockout.populate('created_by', 'name email')
    res.status(201).json({ success: true, data: stockout })
  } catch (err) {
    next(err)
  }
})

// List all stockouts (optionally filter by store and/or status)
router.get('/', async (req, res, next) => {
  try {
    const filter = {}
    if (req.query.store) filter.store = req.query.store
    if (req.query.status) filter.status = req.query.status

    const stockouts = await Stockout.find(filter)
      .populate('items.item_id', 'name category')
      .populate('store', 'name address')
      .populate('created_by', 'name email')
      .populate('accepted_by', 'name email')
      .sort({ createdAt: -1 })
    res.json({ success: true, data: stockouts })
  } catch (err) {
    next(err)
  }
})

// Get single stockout
router.get('/:id', async (req, res, next) => {
  try {
    const stockout = await Stockout.findById(req.params.id)
      .populate('items.item_id', 'name category')
      .populate('store', 'name address')
      .populate('created_by', 'name email')
      .populate('accepted_by', 'name email')

    if (!stockout) {
      return res.status(404).json({ success: false, message: 'Stockout not found' })
    }

    res.json({ success: true, data: stockout })
  } catch (err) {
    next(err)
  }
})

// Accept a stockout (store personnel)
router.patch('/:id/accept', async (req, res, next) => {
  try {
    const { accepted_by } = req.body
    const stockout = await Stockout.findById(req.params.id)

    if (!stockout) {
      return res.status(404).json({ success: false, message: 'Stockout not found' })
    }

    if (stockout.status === 'accepted') {
      return res.status(400).json({ success: false, message: 'Stockout already accepted' })
    }

    if (stockout.status === 'rejected') {
      return res.status(400).json({ success: false, message: 'Cannot accept a rejected stockout' })
    }

    // Add items to the destination store
    await addItemsToStore(stockout.store, stockout.items)

    stockout.status = 'accepted'
    stockout.accepted_by = accepted_by
    stockout.accepted_at = new Date()
    await stockout.save()

    await stockout.populate('items.item_id', 'name category')
    await stockout.populate('store', 'name address')
    await stockout.populate('created_by', 'name email')
    await stockout.populate('accepted_by', 'name email')

    res.json({ success: true, data: stockout })
  } catch (err) {
    next(err)
  }
})

// Reject a stockout
router.patch('/:id/reject', async (req, res, next) => {
  try {
    const stockout = await Stockout.findById(req.params.id)

    if (!stockout) {
      return res.status(404).json({ success: false, message: 'Stockout not found' })
    }

    if (stockout.status === 'accepted') {
      return res.status(400).json({ success: false, message: 'Cannot reject an accepted stockout' })
    }

    if (stockout.status === 'rejected') {
      return res.status(400).json({ success: false, message: 'Stockout already rejected' })
    }

    // Restore deducted stock
    await restoreStock(stockout.items)

    stockout.status = 'rejected'
    await stockout.save()

    await stockout.populate('items.item_id', 'name category')
    await stockout.populate('store', 'name address')
    await stockout.populate('created_by', 'name email')

    res.json({ success: true, data: stockout })
  } catch (err) {
    next(err)
  }
})

// Update a pending stockout (stock controllers)
router.patch('/:id', async (req, res, next) => {
  try {
    const stockout = await Stockout.findById(req.params.id)

    if (!stockout) {
      return res.status(404).json({ success: false, message: 'Stockout not found' })
    }

    if (stockout.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Only pending stockouts can be updated' })
    }

    const body = req.body
    const newItems = body.items
      ? await Promise.all(body.items.map(async (i) => {
        const product = await Product.findById(i.item_id)
        const price = product?.price?.amount ?? 0
        return {
          item_id: i.item_id,
          quantity: i.quantity,
          price,
        }
      }))
      : undefined

    // If items are changing, validate and adjust stock
    if (newItems) {
      // Restore old stock first
      await restoreStock(stockout.items)

      // Validate new stock availability
      const availableMap = await getAvailableStock()
      const insufficient = []

      for (const item of newItems) {
        const productId = item.item_id.toString()
        const available = availableMap.get(productId) || 0
        if (item.quantity > available) {
          insufficient.push({ productId, requested: item.quantity, available })
        }
      }

      if (insufficient.length > 0) {
        // Re-deduct the old stock since we restored it
        await deductStock(stockout.items)
        const details = insufficient.map((i) =>
          `Requested ${i.requested} but only ${i.available} available`
        ).join('; ')
        return res.status(400).json({
          success: false,
          message: `Insufficient stock: ${details}`
        })
      }

      // Deduct new stock
      await deductStock(newItems)
    }

    const update = {}
    if (body.date !== undefined) update.date = body.date
    if (body.store !== undefined) update.store = body.store
    if (body.note !== undefined) update.note = body.note
    if (newItems) update.items = newItems

    const updated = await Stockout.findByIdAndUpdate(
      req.params.id,
      { $set: update },
      { new: true, runValidators: true }
    )
      .populate('items.item_id', 'name category')
      .populate('store', 'name address')
      .populate('created_by', 'name email')

    res.json({ success: true, data: updated })
  } catch (err) {
    next(err)
  }
})

// Delete a stockout
router.delete('/:id', async (req, res, next) => {
  try {
    const stockout = await Stockout.findById(req.params.id)

    if (!stockout) {
      return res.status(404).json({ success: false, message: 'Stockout not found' })
    }

    // Restore deducted stock for pending stockouts
    if (stockout.status === 'pending') {
      await restoreStock(stockout.items)
    }

    await Stockout.findByIdAndDelete(req.params.id)

    res.json({ success: true, message: 'Stockout deleted successfully' })
  } catch (err) {
    next(err)
  }
})

export default router
