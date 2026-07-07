import { Router } from "express"
import Sale from "../models/Sale.js"
import Store from "../models/Stores.js"
import Category from "../models/Category.js"
import CurrencyRate from "../models/CurrencyRate.js"

const router = Router()

function getTodayRange() {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
  return { start, end }
}

async function getLatestRates() {
  const latest = await CurrencyRate.findOne().sort({ date: -1 }).lean()
  if (latest?.rates) return latest.rates
  return { eur: 1, usd: 1, birr: 1, visa: 1 }
}

function computeItemPriceUSD(item, rates) {
  const safeRates = {
    eur: rates?.eur > 0 ? rates.eur : 1,
    usd: rates?.usd > 0 ? rates.usd : 1,
    birr: rates?.birr > 0 ? rates.birr : 1,
    visa: rates?.visa > 0 ? rates.visa : 1,
  }
  return (
    (item.eur || 0) / safeRates.eur +
    (item.usd || 0) / safeRates.usd +
    (item.birr || 0) / safeRates.birr +
    (item.visa || 0) / safeRates.visa
  )
}

router.get("/daily-sales", async (req, res, next) => {
  try {
    const { start, end } = getTodayRange()

    // Fetch today's sales with store populated
    const sales = await Sale.find({
      date_time: { $gte: start, $lt: end },
    }).populate("store", "name address")

    // Aggregate sales by store using the stored totalAmount
    // (converted at the time of sale, so historical values are preserved)
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

      const productsInStock = store.items
        .filter((item) => item.item_id && item.quantity > 0)
        .reduce((sum, item) => sum + item.quantity, 0)

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
      .populate("items.item_id", "name image category")
      .populate("items.group", "name image")
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

    // Collect category IDs and fetch names
    const categoryIds = new Set()
    for (const item of store.items) {
      const cat = item.item_id?.category
      if (cat && typeof cat !== "string") {
        categoryIds.add(cat._id.toString())
      } else if (cat) {
        categoryIds.add(cat.toString())
      }
    }

    const categories = await Category.find({ _id: { $in: Array.from(categoryIds) } }).select("name").lean()
    const categoryMap = new Map()
    for (const c of categories) {
      categoryMap.set(c._id.toString(), c.name)
    }

    const remainingProducts = store.items
      .filter((item) => item.quantity > 0 && item.item_id)
      .map((item) => {
        const product = item.item_id
        const group = item.group
        const cat = product?.category
        const catId = cat && typeof cat !== "string" ? cat._id.toString() : cat
        return {
          product: {
            _id: product?._id?.toString?.() || "—",
            name: product?.name || "—",
            category: catId ? categoryMap.get(catId) || catId : "—",
            image: product?.image || null,
          },
          quantity: item.quantity,
          price: item.price,
          group: group
            ? {
                _id: group._id.toString(),
                name: group.name,
                image: group.image || null,
              }
            : null,
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
        sales: sales.map((s) => {
          // Use the sale's stored rates for per-item conversion
          // so the displayed item prices match the sale's historical totalAmount
          const saleRates = s.rates || { eur: 1, usd: 1, birr: 1, visa: 1 }
          return {
            _id: s._id.toString(),
            invoiceNumber: s.invoiceNumber,
            customerName: s.customerName,
            salesName: s.salesName,
            totalAmount: s.totalAmount,
            items: s.items.map((i) => ({
              name: i.item_id?.name || "—",
              quantity: i.quantity,
              price: computeItemPriceUSD(i, saleRates),
            })),
            processedBy: s.processedBy?.name || "—",
            date_time: s.date_time,
          }
        }),
        remainingProducts,
      },
    })
  } catch (err) {
    next(err)
  }
})

export default router
