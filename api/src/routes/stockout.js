import { Router } from 'express'
import Stockout from '../models/Stockout.js'
import Store from '../models/Stores.js'

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

// Create a stockout (stock controllers)
router.post('/', async (req, res, next) => {
  try {
    const body = req.body
    const stockout = new Stockout({
      created_by: body.created_by,
      date: body.date,
      store: body.store,
      items: body.items.map((i) => ({
        item_id: i.item_id,
        quantity: i.quantity,
        price: i.price
      })),
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
    const update = {}

    if (body.date !== undefined) update.date = body.date
    if (body.store !== undefined) update.store = body.store
    if (body.note !== undefined) update.note = body.note
    if (body.items !== undefined) {
      update.items = body.items.map((i) => ({
        item_id: i.item_id,
        quantity: i.quantity,
        price: i.price
      }))
    }

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
    const stockout = await Stockout.findByIdAndDelete(req.params.id)

    if (!stockout) {
      return res.status(404).json({ success: false, message: 'Stockout not found' })
    }

    res.json({ success: true, message: 'Stockout deleted successfully' })
  } catch (err) {
    next(err)
  }
})

export default router
