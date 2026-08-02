import { Router } from 'express'
import Store from '../models/Stores.js'
import Sale from '../models/Sale.js'
import Products from '../models/Products.js'
import User from '../models/User.js'
import { authMiddleware } from '../middleware/auth.js'
import { getLatestRates } from '../services/rates.js'
import * as peds from '../services/peds.js'

const router = Router()

/* -------------------------------------------------------------------------- */
/*                               CALLBACK AUTH                                */
/* -------------------------------------------------------------------------- */

function verifyPedsCallbackAuth(req, res, next) {
  const secret = process.env.PEDS_CALLBACK_SECRET || 'peds-callback-secret'
  const authHeader = req.headers.authorization || ''
  const token = authHeader.startsWith('Basic ') ? authHeader.slice(6) : null
  if (!token) {
    return res.status(401).json({ message: 'Unauthorized' })
  }
  const decoded = Buffer.from(token, 'base64').toString('utf8')
  if (decoded !== secret) {
    return res.status(401).json({ message: 'Invalid credentials' })
  }
  next()
}

/* -------------------------------------------------------------------------- */
/*                            INVENTORY HELPERS                               */
/* -------------------------------------------------------------------------- */

async function deductItemsFromStore(storeId, items) {
  const store = await Store.findById(storeId)
  if (!store) throw new Error('Store not found')

  for (const sold of items) {
    const productId = sold.item_id.toString()
    const existing = store.items.find((i) => i.item_id.toString() === productId)
    if (!existing) {
      console.warn(`[peds] Product ${productId} not in store ${storeId}`)
      continue
    }
    if (existing.quantity < sold.quantity) {
      console.warn(
        `[peds] Insufficient stock for ${productId}. Avail: ${existing.quantity}, Req: ${sold.quantity}`
      )
      existing.quantity = 0
    } else {
      existing.quantity -= sold.quantity
    }
  }

  await store.save()
  return store
}

async function restoreItemsToStore(storeId, items) {
  const store = await Store.findById(storeId)
  if (!store) throw new Error('Store not found')

  for (const item of items) {
    const productId = item.item_id.toString()
    const existing = store.items.find((i) => i.item_id.toString() === productId)
    if (existing) {
      existing.quantity += item.quantity
    } else {
      store.items.push({
        item_id: item.item_id,
        quantity: item.quantity,
        price: item.birr || item.usd || item.eur || item.visa || 0,
      })
    }
  }

  await store.save()
  return store
}

/* -------------------------------------------------------------------------- */
/*                         PEDS CALLBACK (CONFIRMPAYMENT)                     */
/* -------------------------------------------------------------------------- */

router.post('/callback', verifyPedsCallbackAuth, async (req, res) => {
  try {
    const payload = req.body
    const machineId = payload.MachineID

    // Find store by MachineID or POSId
    const store = await Store.findOne({
      $or: [{ pedsMachineId: machineId }, { pedsPosId: machineId }],
    })
    if (!store) {
      console.error(`[peds-callback] No store found for MachineID ${machineId}`)
      return res.status(404).json({ message: 'Store not found' })
    }

    // Idempotency: skip if already recorded
    const existing = await Sale.findOne({ pedsInvoiceNo: payload.InvoiceNumber })
    if (existing) {
      return res.status(200).json({
        message: 'Sale already recorded',
        Success: true,
        Content: payload.InvoiceNumber,
      })
    }

    // Map PEDS items to IMS products
    const items = []
    const unresolved = []
    for (const pi of payload.SalesDataDetails || []) {
      let product = await Products.findOne({ pedsItemId: pi.ItemIdentifierId })
      if (!product) {
        // Fallback: try matching by Mongo _id
        try {
          product = await Products.findById(pi.ItemIdentifierId)
        } catch {
          product = null
        }
      }

      if (product) {
        items.push({
          item_id: product._id,
          quantity: pi.Quantity,
          eur: 0,
          usd: 0,
          birr: pi.TotalAmount || pi.TotalItemPrice || 0,
          visa: 0,
          pedsItemIdentifierId: pi.ItemIdentifierId,
        })
      } else {
        unresolved.push(pi)
      }
    }

    if (items.length === 0) {
      console.error(
        `[peds-callback] No mapped products for invoice ${payload.InvoiceNumber}`
      )
      return res.status(400).json({
        message: 'No products mapped for this sale',
        Success: false,
      })
    }

    // Resolve processor user by name if possible
    let processedBy = null
    if (payload.UserName) {
      const user = await User.findOne({
        name: { $regex: new RegExp(`^${payload.UserName}$`, 'i') },
      })
      if (user) processedBy = user._id
    }

    const rates = await getLatestRates()
    const totalAmount = items.reduce(
      (sum, i) => sum + (i.birr || 0) / (rates.birr || 1),
      0
    )

    const sale = new Sale({
      items,
      totalAmount,
      rates,
      customerName: payload.CustomerName || 'Walk-in',
      salesName: payload.UserName || 'PEDS',
      store: store._id,
      processedBy,
      date_time: payload.SoldDate ? new Date(payload.SoldDate) : new Date(),
      invoiceNumber: payload.InvoiceNumber,
      pedsInvoiceNo: payload.InvoiceNumber,
      pedsFsInvoiceNo: payload.FsInvoiceNo,
      pedsGuid: payload.GuId,
      pedsStatus: 'fully_paid',
      pedsMachineId: payload.MachineID,
      source: 'peds',
      unresolvedPedsItems: unresolved,
    })

    await sale.save()

    // Deduct inventory
    try {
      await deductItemsFromStore(store._id, items)
    } catch (err) {
      console.error('[peds-callback] Inventory deduction error:', err.message)
    }

    res.status(200).json({
      message: 'Successfully Posted.',
      Success: true,
      Content: payload.InvoiceNumber,
    })
  } catch (err) {
    console.error('[peds-callback] Error:', err)
    res.status(500).json({
      message: err.message,
      Success: false,
    })
  }
})

/* -------------------------------------------------------------------------- */
/*                               VOID WEBHOOK                                 */
/* -------------------------------------------------------------------------- */

router.post('/callback/void', verifyPedsCallbackAuth, async (req, res) => {
  try {
    const { InvoiceNumber } = req.body
    if (!InvoiceNumber) {
      return res.status(400).json({ message: 'InvoiceNumber required' })
    }

    const sale = await Sale.findOne({ pedsInvoiceNo: InvoiceNumber })
    if (!sale) {
      return res.status(404).json({ message: 'Sale not found' })
    }

    if (sale.source === 'peds') {
      // Restore inventory only if not already voided
      if (sale.pedsStatus !== 'voided') {
        try {
          await restoreItemsToStore(sale.store, sale.items)
        } catch (err) {
          console.error('[peds-void] Inventory restore error:', err.message)
        }
      }
      sale.pedsStatus = 'voided'
      await sale.save()
    }

    res.status(200).json({ message: 'Void recorded', Success: true })
  } catch (err) {
    console.error('[peds-void] Error:', err)
    res.status(500).json({ message: err.message, Success: false })
  }
})

/* -------------------------------------------------------------------------- */
/*                         PROXY ROUTES (JWT protected)                       */
/* -------------------------------------------------------------------------- */

async function getStoreOr404(req, res) {
  const isAdmin = req.user?.role === 'admin'
  const store = await Store.findById(req.params.storeId)
  if (!store) {
    res.status(404).json({ message: 'Store not found' })
    return null
  }
  if (!isAdmin && store._id.toString() !== req.user?.store?.toString?.()) {
    res.status(403).json({ message: 'Access denied' })
    return null
  }
  if (!store.pedsEnabled) {
    res.status(400).json({ message: 'PEDS not enabled for this store' })
    return null
  }
  return store
}

router.post('/:storeId/hold-sales', authMiddleware, async (req, res) => {
  try {
    const store = await getStoreOr404(req, res)
    if (!store) return

    const payload = req.body
    const result = await peds.addHoldSale(store, payload)
    res.json(result)
  } catch (err) {
    console.error('[peds-proxy] addHoldSale error:', err)
    res.status(502).json({ message: err.message, pedsResponse: err.pedsResponse })
  }
})

router.post('/:storeId/invoice-exists', authMiddleware, async (req, res) => {
  try {
    const store = await getStoreOr404(req, res)
    if (!store) return

    const result = await peds.checkInvoiceExists(store, req.body.invoiceNo)
    res.json(result)
  } catch (err) {
    res.status(502).json({ message: err.message })
  }
})

router.post('/:storeId/invoice-status', authMiddleware, async (req, res) => {
  try {
    const store = await getStoreOr404(req, res)
    if (!store) return

    const result = await peds.getInvoiceStatus(store, req.body.invoiceNo)
    res.json(result)
  } catch (err) {
    res.status(502).json({ message: err.message })
  }
})

router.post('/:storeId/paid-status', authMiddleware, async (req, res) => {
  try {
    const store = await getStoreOr404(req, res)
    if (!store) return

    const result = await peds.getPaidStatus(store, req.body.invoiceNo)
    res.json(result)
  } catch (err) {
    res.status(502).json({ message: err.message })
  }
})

router.post('/:storeId/sales-by-time', authMiddleware, async (req, res) => {
  try {
    const store = await getStoreOr404(req, res)
    if (!store) return

    const minutes = Number(req.body.minutes) || 60
    const result = await peds.getSalesByTime(store, minutes)
    res.json(result)
  } catch (err) {
    res.status(502).json({ message: err.message })
  }
})

router.post('/:storeId/sales-info', authMiddleware, async (req, res) => {
  try {
    const store = await getStoreOr404(req, res)
    if (!store) return

    const result = await peds.getSalesInfo(store, req.body.invoiceNo)
    res.json(result)
  } catch (err) {
    res.status(502).json({ message: err.message })
  }
})

router.post('/:storeId/void', authMiddleware, async (req, res) => {
  try {
    const store = await getStoreOr404(req, res)
    if (!store) return

    const result = await peds.voidInvoice(store, req.body.invoiceNo)
    res.json(result)
  } catch (err) {
    res.status(502).json({ message: err.message })
  }
})

router.post('/:storeId/test-connection', authMiddleware, async (req, res) => {
  try {
    const store = await getStoreOr404(req, res)
    if (!store) return

    const result = await peds.testConnection(store)
    res.json({
      connected: true,
      pedsResponse: result,
      message: result?.Message || 'PEDS responded successfully',
    })
  } catch (err) {
    res.status(502).json({
      connected: false,
      message: err.message,
      pedsResponse: err.pedsResponse || null,
    })
  }
})

export default router
