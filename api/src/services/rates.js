import CurrencyRate from "../models/CurrencyRate.js"
import { fetchLatestRates as fetchFromAPI } from "./exchange-rates.js"

/**
 * Get the latest exchange rates, fetching from the external API
 * if none exist in the database.
 *
 * @returns {Promise<{eur:number, usd:number, birr:number, visa:number}>}
 */
export async function getLatestRates() {
  const latest = await CurrencyRate.findOne().sort({ date: -1 }).lean()
  if (latest?.rates) return latest.rates

  // No rates in DB — fetch from external API and cache them
  try {
    const rates = await fetchFromAPI(null)

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    await CurrencyRate.findOneAndUpdate(
      { date: today },
      { base: "USD", rates, date: today },
      { new: true, upsert: true }
    )

    return rates
  } catch (err) {
    console.error("[rates] Failed to fetch from external API:", err.message)
    return { eur: 1, usd: 1, birr: 1, visa: 1 }
  }
}
