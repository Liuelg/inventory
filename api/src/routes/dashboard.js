import { Router } from "express"
import Sale from "../models/Sale.js"
import Store from "../models/Stores.js"

const router = Router()

function getTodayRange() {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
  return { start, end }
}

router.get("/daily-sales", async (req, res, next) => {
  try {
    const { start, end } = getTodayRange()

    // Fetch today's sales with store populated
    const sales = await Sale.find({
      date_time: { $gte: start, $lt: end },
    }).populate("store", "name address")

    // Aggregate sales by store
    const salesMap = new Map()
    for (const sale of sales) {
      const storeId = sale.store?._id?.toString?.() || sale.store?.toString?.()
      if (!storeId) continue

      const existing = salesMap.get(storeId) || {
        totalSales: 0,
        transactions: 0,
        itemsSold: 0,
      }

      const itemsQuantity = sale.items.reduce(
        (sum, item) => sum + (item.quantity || 0),
        0
      )

      salesMap.set(storeId, {
        totalSales: existing.totalSales + (sale.totalAmount || 0),
        transactions: existing.transactions + 1,
        itemsSold: existing.itemsSold + itemsQuantity,
      })
    }

    // Fetch all stores with items
    const stores = await Store.find().populate("items.item_id", "name")

    // Build dashboard rows
    const data = stores.map((store) => {
      const storeId = store._id.toString()
      const salesData = salesMap.get(storeId) || {
        totalSales: 0,
        transactions: 0,
        itemsSold: 0,
      }

      const productsInStock = store.items.reduce(
        (sum, item) => sum + (item.quantity || 0),
        0
      )

      return {
        store: {
          _id: storeId,
          name: store.name,
          address: store.address,
        },
        totalSales: salesData.totalSales,
        transactions: salesData.transactions,
        itemsSold: salesData.itemsSold,
        productsInStock,
      }
    })

    res.json({ success: true, data })
  } catch (err) {
    next(err)
  }
})

router.get("/store/:storeId", async (req, res, next) => {
  try {
    const { start, end } = getTodayRange()
    const storeId = req.params.storeId

    const store = await Store.findById(storeId)
      .populate("items.item_id", "name category image")
      .populate("manager_id", "name email")

    if (!store) {
      return res.status(404).json({ success: false, message: "Store not found" })
    }

    // Today's sales for this store
    const sales = await Sale.find({
      store: storeId,
      date_time: { $gte: start, $lt: end },
    })
      .populate("items.item_id", "name image")
      .populate("processedBy", "name email")
      .sort({ date_time: -1 })

    const todaySales = {
      totalSales: 0,
      transactions: sales.length,
      itemsSold: 0,
    }

    for (const sale of sales) {
      todaySales.totalSales += sale.totalAmount || 0
      todaySales.itemsSold += sale.items.reduce(
        (sum, item) => sum + (item.quantity || 0),
        0
      )
    }

    const remainingProducts = store.items.map((item) => {
      const product = item.item_id
      return {
        product: {
          _id: product?._id?.toString?.() || item.item_id?.toString?.(),
          name: product?.name || "—",
          category: product?.category || "—",
          image: product?.image || null,
        },
        quantity: item.quantity,
        price: item.price,
      }
    })

    res.json({
      success: true,
      data: {
        store: {
          _id: store._id.toString(),
          name: store.name,
          address: store.address,
        },
        todaySales,
        sales: sales.map((s) => ({
          _id: s._id.toString(),
          invoiceNumber: s.invoiceNumber,
          customerName: s.customerName,
          totalAmount: s.totalAmount,
          items: s.items.map((i) => ({
            name: i.item_id?.name || "—",
            quantity: i.quantity,
            price: i.price,
          })),
          processedBy: s.processedBy?.name || "—",
          date_time: s.date_time,
        })),
        remainingProducts,
      },
    })
  } catch (err) {
    next(err)
  }
})

export default router
