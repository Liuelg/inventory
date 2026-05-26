import { Router } from "express"
import mongoose from "mongoose"
import Sale from "../models/Sale.js"
import GoodIn from "../models/Goodin.js"
import Stockout from "../models/Stockout.js"

const router = Router()

function getDateRange(period, anchorDate) {
  const date = anchorDate ? new Date(anchorDate) : new Date()

  if (period === "daily") {
    const start = new Date(date.getFullYear(), date.getMonth(), date.getDate())
    const end = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1)
    return { start, end }
  }

  if (period === "weekly") {
    const end = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1)
    const start = new Date(date.getFullYear(), date.getMonth(), date.getDate() - 6)
    return { start, end }
  }

  if (period === "monthly") {
    const start = new Date(date.getFullYear(), date.getMonth(), 1)
    const end = new Date(date.getFullYear(), date.getMonth() + 1, 1)
    return { start, end }
  }

  // default to daily
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const end = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1)
  return { start, end }
}

function getModel(type) {
  if (type === "sales") return Sale
  if (type === "goodIns") return GoodIn
  if (type === "stockouts") return Stockout
  return null
}

function getDateField(type) {
  if (type === "sales") return "date_time"
  return "date"
}

function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id)
}

router.get("/", async (req, res, next) => {
  try {
    const { type, period, date, store } = req.query

    if (!type || !["sales", "goodIns", "stockouts"].includes(type)) {
      return res.status(400).json({ success: false, message: "Invalid or missing type. Use sales, goodIns, or stockouts." })
    }

    if (!period || !["daily", "weekly", "monthly"].includes(period)) {
      return res.status(400).json({ success: false, message: "Invalid or missing period. Use daily, weekly, or monthly." })
    }

    const Model = getModel(type)
    const dateField = getDateField(type)
    const { start, end } = getDateRange(period, date)

    const query = {
      [dateField]: { $gte: start, $lt: end },
    }

    if (store && isValidObjectId(store)) {
      query.store = store
    }

    const records = await Model.find(query)
      .populate("store", "name address")
      .populate("items.item_id", "name category")
      .sort({ [dateField]: -1 })

    // Aggregate summary
    let totalItems = 0
    let totalValue = 0

    // Breakdown by product
    const productMap = new Map()

    // Breakdown by store
    const storeMap = new Map()

    for (const record of records) {
      const storeId = record.store?._id?.toString?.() || record.store?.toString?.()
      const storeName = record.store?.name || "Unknown Store"

      let recordQuantity = 0
      let recordValue = 0

      for (const item of record.items || []) {
        const qty = item.quantity || 0
        const price = item.price || 0
        const itemValue = qty * price

        totalItems += qty
        totalValue += itemValue
        recordQuantity += qty
        recordValue += itemValue

        const productId = item.item_id?._id?.toString?.() || item.item_id?.toString?.()
        const productName = item.item_id?.name || "Unknown Product"

        if (productId) {
          const existing = productMap.get(productId) || {
            product: { _id: productId, name: productName },
            quantity: 0,
            value: 0,
          }
          existing.quantity += qty
          existing.value += itemValue
          productMap.set(productId, existing)
        }
      }

      if (storeId) {
        const existing = storeMap.get(storeId) || {
          store: { _id: storeId, name: storeName },
          quantity: 0,
          value: 0,
          records: 0,
        }
        existing.quantity += recordQuantity
        existing.value += recordValue
        existing.records += 1
        storeMap.set(storeId, existing)
      }
    }

    const breakdown = Array.from(productMap.values()).sort((a, b) => b.quantity - a.quantity)
    const byStore = Array.from(storeMap.values()).sort((a, b) => b.quantity - a.quantity)

    res.json({
      success: true,
      data: {
        type,
        period,
        start: start.toISOString(),
        end: end.toISOString(),
        storeFilter: store || null,
        summary: {
          totalRecords: records.length,
          totalItems,
          totalValue,
        },
        breakdown,
        byStore,
      },
    })
  } catch (err) {
    next(err)
  }
})

export default router
