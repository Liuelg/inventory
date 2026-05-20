import { Router } from 'express'
import Stock from '../models/Stock.js'

const router = Router()

router.post('/', async (req, res, next) => {
  try {
    const body = req.body
    const stock = new Stock({
      created_by: body.created_by,
      date: body.date,
      items: body.items.map((i) => ({
        item_id: i.item_id,
        quantity: i.quantity,
        remaining: i.remaining ?? i.quantity,
        price: i.price,
      })),
      totalAmount: body.totalAmount,
      description: body.description,
      note: body.note,
    })
    await stock.save()
    await stock.populate('items.item_id')
    await stock.populate('created_by', 'name email')
    res.status(201).json(stock)
  } catch (err) {
    next(err)
  }
})

router.get('/', async (req, res, next) => {
  try {
    const stocks = await Stock.find()
      .populate('items.item_id', 'name category')
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
      .populate('items.item_id', 'name category')
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
    if (body.totalAmount !== undefined) update.totalAmount = body.totalAmount
    if (body.items !== undefined) {
      update.items = body.items.map((i) => ({
        item_id: i.item_id,
        quantity: i.quantity,
        remaining: i.remaining ?? i.quantity,
        price: i.price,
      }))
    }

    const stock = await Stock.findByIdAndUpdate(
      req.params.id,
      { $set: update },
      { new: true, runValidators: true }
    )
      .populate('items.item_id', 'name category')
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

export default router
