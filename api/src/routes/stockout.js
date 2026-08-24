import { Router } from 'express'
import Stockout from '../models/Stockout.js'
import Stock from '../models/Stock.js'
import Store from '../models/Stores.js'
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
      (i) => i.item_id.toString() === incoming.item_id.toString() && i.price === incoming.price
    )

    if (existing) {
      existing.quantity += incoming.quantity
      if (incoming.group) {
        existing.group = incoming.group
      }
    } else {
      store.items.push({
        item_id: incoming.item_id,
        quantity: incoming.quantity,
        price: incoming.price,
        group: incoming.group || null
      })
    }
  }

  await store.save()
  return store
}

// Create a stockout
router.post('/', async (req, res, next) => {
  try {
    const body = req.body
    const items = await Promise.all(body.items.map(async (i) => {
      const product = await Product.findById(i.item_id)
      const price = i.price ?? product?.price?.amount ?? 0
      return {
        item_id: i.item_id,
        quantity: i.quantity,
        price,
        group: i.group || null,
      }
    }))

    const stockout = new Stockout({
      created_by: body.created_by,
      date: body.date,
      store: body.store,
      items,
      note: body.note
    })
    await stockout.save()
    await stockout.populate('items.item_id', 'name category image price prices')
    await stockout.populate('store', 'name address')
    await stockout.populate('created_by', 'name email')
    res.status(201).json({ success: true, data: stockout })
  } catch (err) {
    next(err)
  }
})

// List all stockouts
router.get('/', async (req, res, next) => {
  try {
    const filter = {}
    if (req.query.store) filter.store = req.query.store
    if (req.query.status) filter.status = req.query.status

    const stockouts = await Stockout.find(filter)
      .populate('items.item_id', 'name category image price prices')
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
      .populate('items.item_id', 'name category image price prices')
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

// Accept a stockout
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

    await addItemsToStore(stockout.store, stockout.items)

    // Deduct from central stock (FIFO — oldest first)
    for (const item of stockout.items) {
      const productId = item.item_id?.toString?.() || item.item_id
      let qtyToDeduct = item.quantity || 0
      if (!productId || qtyToDeduct <= 0) continue

      const stocks = await Stock.find({ 'items.item_id': productId }).sort({ date: 1 })

      for (const stock of stocks) {
        if (qtyToDeduct <= 0) break

        let stockModified = false
        for (const stockItem of stock.items) {
          if (stockItem.item_id.toString() !== productId) continue
          if (stockItem.remaining <= 0) continue
          if (qtyToDeduct <= 0) break

          const deduct = Math.min(qtyToDeduct, stockItem.remaining)
          stockItem.remaining -= deduct
          qtyToDeduct -= deduct
          stockModified = true
        }

        if (stockModified) {
          await stock.save()
        }
      }
    }

    stockout.status = 'accepted'
    stockout.accepted_by = accepted_by
    stockout.accepted_at = new Date()
    await stockout.save()

    await stockout.populate('items.item_id', 'name category image price prices')
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

    stockout.status = 'rejected'
    await stockout.save()

    await stockout.populate('items.item_id', 'name category image')
    await stockout.populate('store', 'name address')
    await stockout.populate('created_by', 'name email')

    res.json({ success: true, data: stockout })
  } catch (err) {
    next(err)
  }
})

// Update a pending stockout
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
        const price = i.price ?? product?.price?.amount ?? 0
        return {
          item_id: i.item_id,
          quantity: i.quantity,
          price,
          group: i.group || null,
        }
      }))
      : undefined

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
      .populate('items.item_id', 'name category image price prices')
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

    await Stockout.findByIdAndDelete(req.params.id)

    res.json({ success: true, message: 'Stockout deleted successfully' })
  } catch (err) {
    next(err)
  }
})

export default router
