import { Router } from "express"
import mongoose from "mongoose"
import Sale from "../models/Sale.js"
import GoodIn from "../models/Goodin.js"
import Stockout from "../models/Stockout.js"
import Stock from "../models/Stock.js"
import Store from "../models/Stores.js"
import { getLatestRates } from "../services/rates.js"

const router = Router()

function parseLocalDate(dateStr) {
  // Parse YYYY-MM-DD as UTC midnight so date queries are consistent
  // regardless of the server's local timezone
  const [year, month, day] = dateStr.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day))
}

function getRangeFromDates(startDateStr, endDateStr, tzOffsetMinutes = 0) {
  const offsetMs = tzOffsetMinutes * 60000
  const start = new Date(parseLocalDate(startDateStr).getTime() + offsetMs)
  const end = new Date(parseLocalDate(endDateStr).getTime() + offsetMs + 24 * 60 * 60 * 1000)
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

function computeItemValueUSD(item, rates) {
  const safeRates = {
    eur: rates?.eur > 0 ? rates.eur : 1,
    usd: rates?.usd > 0 ? rates.usd : 1,
    birr: rates?.birr > 0 ? rates.birr : 1,
    visa: rates?.visa > 0 ? rates.visa : 1,
  }
  const priceUSD =
    (item.eur || 0) / safeRates.eur +
    (item.usd || 0) / safeRates.usd +
    (item.birr || 0) / safeRates.birr +
    (item.visa || 0) / safeRates.visa
  return priceUSD
}

function convertUSDToCurrency(amountUSD, targetCurrency, rates) {
  const safeRates = {
    eur: rates?.eur > 0 ? rates.eur : 1,
    usd: rates?.usd > 0 ? rates.usd : 1,
    birr: rates?.birr > 0 ? rates.birr : 1,
    visa: rates?.visa > 0 ? rates.visa : 1,
  }
  return amountUSD * (safeRates[targetCurrency] || 1)
}

router.get("/", async (req, res, next) => {
  try {
    const { type, startDate, endDate, store, currency, timezoneOffset } = req.query
    const targetCurrency = currency || 'usd'
    const isAdmin = req.user?.role === 'admin'
    const userStore = req.user?.store?.toString?.()
    const tzOffset = parseInt(timezoneOffset, 10) || 0

    if (!type || !["sales", "goodIns", "stockouts", "remaining"].includes(type)) {
      return res.status(400).json({ success: false, message: "Invalid or missing type. Use sales, goodIns, stockouts, or remaining." })
    }

    // Non-admins can only view their own store's data
    const effectiveStore = isAdmin ? store : userStore
    if (!isAdmin && !userStore) {
      return res.status(400).json({ success: false, message: "Your account is not assigned to a store. Contact an admin." })
    }

    if (type === "remaining") {
      let totalItems = 0
      let totalValue = 0
      const productMap = new Map()
      let recordCount = 0

      if (effectiveStore && isValidObjectId(effectiveStore)) {
        // Filter remaining products by a specific store
        const storeDoc = await Store.findById(effectiveStore).populate("items.item_id", "name category")

        if (!storeDoc) {
          return res.status(404).json({ success: false, message: "Store not found" })
        }

        recordCount = 1

        for (const item of storeDoc.items || []) {
          const qty = item.quantity || 0
          if (qty <= 0) continue

          const price = item.price || 0
          const itemValue = qty * price

          totalItems += qty
          totalValue += itemValue

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
      } else {
        // No store filter — calculate true remaining central inventory
        // Remaining = total received - total sent out (accepted stockouts)
        const stocks = await Stock.find().populate("items.item_id", "name category")
        const acceptedStockouts = await Stockout.find({ status: "accepted" }).populate("items.item_id", "name category")

        // Map: productId -> { received, sentOut, totalValue, productName }
        const calcMap = new Map()

        for (const stock of stocks) {
          for (const item of stock.items || []) {
            const productId = item.item_id?._id?.toString?.() || item.item_id?.toString?.()
            if (!productId) continue

            const existing = calcMap.get(productId) || {
              productName: item.item_id?.name || "Unknown Product",
              received: 0,
              sentOut: 0,
              valueSum: 0,
              valueCount: 0,
            }
            existing.received += item.quantity || 0
            existing.valueSum += (item.price || 0) * (item.quantity || 0)
            existing.valueCount += item.quantity || 0
            calcMap.set(productId, existing)
          }
        }

        for (const so of acceptedStockouts) {
          for (const item of so.items || []) {
            const productId = item.item_id?._id?.toString?.() || item.item_id?.toString?.()
            if (!productId) continue

            const existing = calcMap.get(productId)
            if (existing) {
              existing.sentOut += item.quantity || 0
            }
          }
        }

        for (const [productId, data] of calcMap) {
          const remaining = data.received - data.sentOut
          if (remaining <= 0) continue

          const avgPrice = data.valueCount > 0 ? data.valueSum / data.valueCount : 0
          const itemValue = remaining * avgPrice

          totalItems += remaining
          totalValue += itemValue

          productMap.set(productId, {
            product: { _id: productId, name: data.productName },
            quantity: remaining,
            value: itemValue,
          })
        }

        recordCount = productMap.size
      }

      const breakdown = Array.from(productMap.values()).sort((a, b) => b.quantity - a.quantity)
      const now = new Date()

      return res.json({
        success: true,
        data: {
          type: "remaining",
          period: "daily",
          start: now.toISOString(),
          end: now.toISOString(),
          storeFilter: effectiveStore || null,
          currency: targetCurrency,
          summary: {
            totalRecords: recordCount,
            totalItems,
            totalValue,
          },
          breakdown,
          byStore: [],
          transactions: [],
        },
      })
    }

    if (!startDate || !endDate) {
      return res.status(400).json({ success: false, message: "startDate and endDate are required." })
    }

    const Model = getModel(type)
    const dateField = getDateField(type)
    const { start, end } = getRangeFromDates(startDate, endDate, tzOffset)

    const query = {
      [dateField]: { $gte: start, $lt: end },
    }

    if (effectiveStore && isValidObjectId(effectiveStore)) {
      query.store = effectiveStore
    }

    const records = await Model.find(query)
      .populate("store", "name address")
      .populate("processedBy", "name")
      .populate("items.item_id", "name category")
      .sort({ [dateField]: -1 })

    const isSales = type === 'sales'
    const conversionRates = await getLatestRates()

    // Aggregate summary
    let totalItems = 0
    let totalValueUSD = 0

    // Breakdown by product
    const productMap = new Map()

    // Breakdown by store
    const storeMap = new Map()

    // Individual transactions (for sales detail view)
    const transactions = []

    for (const record of records) {
      const storeId = record.store?._id?.toString?.() || record.store?.toString?.()
      const storeName = record.store?.name || "Unknown Store"

      let recordQuantity = 0
      let recordValueUSD = 0

      const recordRates = isSales
        ? (record.rates || conversionRates)
        : null

      if (isSales) {
        recordValueUSD = record.totalAmount || 0
        totalValueUSD += recordValueUSD
      }

      const transactionItems = []

      for (const item of record.items || []) {
        const qty = item.quantity || 0

        const itemValueUSD = isSales
          ? computeItemValueUSD(item, recordRates)
          : qty * (item.price || 0)

        totalItems += qty
        recordQuantity += qty

        if (!isSales) {
          totalValueUSD += itemValueUSD
          recordValueUSD += itemValueUSD
        }

        const productId = item.item_id?._id?.toString?.() || item.item_id?.toString?.()
        const productName = item.item_id?.name || "Unknown Product"

        if (productId) {
          const existing = productMap.get(productId) || {
            product: { _id: productId, name: productName },
            quantity: 0,
            value: 0,
          }
          existing.quantity += qty
          existing.value += itemValueUSD
          productMap.set(productId, existing)
        }

        if (isSales) {
          transactionItems.push({
            product: { _id: productId || "—", name: productName },
            quantity: qty,
            value: itemValueUSD,
            eur: item.eur || 0,
            usd: item.usd || 0,
            birr: item.birr || 0,
            visa: item.visa || 0,
          })
        }
      }

      if (isSales) {
        transactions.push({
          _id: record._id.toString(),
          invoiceNumber: record.invoiceNumber || "—",
          customerName: record.customerName || undefined,
          salesName: record.processedBy?.name || record.salesName || undefined,
          storeName: storeName,
          date: record[dateField]?.toISOString?.() || record[dateField],
          totalAmount: recordValueUSD,
          items: transactionItems,
        })
      }

      if (storeId) {
        const existing = storeMap.get(storeId) || {
          store: { _id: storeId, name: storeName },
          quantity: 0,
          value: 0,
          records: 0,
        }
        existing.quantity += recordQuantity
        existing.value += recordValueUSD
        existing.records += 1
        storeMap.set(storeId, existing)
      }
    }

    // Convert all USD values to target currency
    const totalValue = convertUSDToCurrency(totalValueUSD, targetCurrency, conversionRates)

    const breakdown = Array.from(productMap.values()).map((item) => ({
      ...item,
      value: convertUSDToCurrency(item.value, targetCurrency, conversionRates),
    })).sort((a, b) => b.quantity - a.quantity)

    const byStore = Array.from(storeMap.values()).map((item) => ({
      ...item,
      value: convertUSDToCurrency(item.value, targetCurrency, conversionRates),
    })).sort((a, b) => b.quantity - a.quantity)

    const transactionsConverted = transactions.map((t) => ({
      ...t,
      totalAmount: convertUSDToCurrency(t.totalAmount, targetCurrency, conversionRates),
      items: t.items.map((i) => ({
        ...i,
        value: convertUSDToCurrency(i.value, targetCurrency, conversionRates),
      })),
    }))

    res.json({
      success: true,
      data: {
        type,
        start: start.toISOString(),
        end: end.toISOString(),
        storeFilter: store || null,
        currency: targetCurrency,
        summary: {
          totalRecords: records.length,
          totalItems,
          totalValue,
        },
        breakdown,
        byStore,
        transactions: transactionsConverted,
      },
    })
  } catch (err) {
    next(err)
  }
})

export default router
