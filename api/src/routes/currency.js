import { Router } from "express"
import CurrencyRate from "../models/CurrencyRate.js"
import { fetchLatestRates } from "../services/frankfurter.js"

const router = Router()

// Get the latest currency rates
router.get("/latest", async (_req, res, next) => {
  try {
    const latest = await CurrencyRate.findOne().sort({ date: -1 })
    if (!latest) {
      return res.json({
        success: true,
        data: {
          base: "USD",
          rates: { eur: 1, usd: 1, birr: 1, visa: 1 },
          date: new Date().toISOString(),
        },
      })
    }
    res.json({ success: true, data: latest })
  } catch (err) {
    next(err)
  }
})

// Get all currency rate history
router.get("/", async (_req, res, next) => {
  try {
    const rates = await CurrencyRate.find().sort({ date: -1 }).limit(30)
    res.json({ success: true, data: rates })
  } catch (err) {
    next(err)
  }
})

// Update or create today's currency rates (admin only)
router.post("/", async (req, res, next) => {
  try {
    if (req.user?.role !== "admin") {
      return res.status(403).json({ success: false, message: "Admin access required" })
    }

    const { base, rates } = req.body
    if (!rates || typeof rates !== "object") {
      return res.status(400).json({ success: false, message: "Rates object is required" })
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const update = {
      base: base || "USD",
      rates: {
        eur: Number(rates.eur) || 1,
        usd: Number(rates.usd) || 1,
        birr: Number(rates.birr) || 1,
        visa: Number(rates.visa) || 1,
      },
      date: today,
    }

    const doc = await CurrencyRate.findOneAndUpdate(
      { date: today },
      update,
      { new: true, upsert: true }
    )

    res.json({ success: true, data: doc })
  } catch (err) {
    next(err)
  }
})

// Sync latest rates from Frankfurter API (admin only)
router.post("/sync", async (req, res, next) => {
  try {
    if (req.user?.role !== "admin") {
      return res.status(403).json({ success: false, message: "Admin access required" })
    }

    // Fetch existing rates as fallback in case Frankfurter is missing a currency
    const latest = await CurrencyRate.findOne().sort({ date: -1 }).lean()
    const fallbackRates = latest?.rates || null

    const rates = await fetchLatestRates(fallbackRates)

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const update = {
      base: "USD",
      rates,
      date: today,
    }

    const doc = await CurrencyRate.findOneAndUpdate(
      { date: today },
      update,
      { new: true, upsert: true }
    )

    res.json({
      success: true,
      data: doc,
      message: "Rates synced successfully from Frankfurter",
    })
  } catch (err) {
    next(err)
  }
})

export default router
