import CurrencyRate from "../models/CurrencyRate.js"
import { fetchLatestRates as fetchFromAPI } from "./exchange-rates.js"

/**
 * Get the latest exchange rates, fetching from the external API
 * if none exist in the database.
 *
 * @returns {Promise<{eur:number, usd:number, birr:number, visa:number, gbp:number}>}
 */
function areRatesReal(rates) {
  if (!rates) return false
  // For rates to be considered "real", all non-base currencies must have
  // actual exchange rates (not the default fallback of 1).
  // USD is the base (always 1). Visa is treated as USD (always 1).
  return rates.eur !== 1 && rates.birr !== 1 && rates.gbp !== 1
}

export async function getLatestRates() {
  const latest = await CurrencyRate.findOne().sort({ date: -1 }).lean()

  if (latest?.rates && areRatesReal(latest.rates)) {
    console.log("[rates] Using cached rates:", latest.rates)
    return latest.rates
  }

  console.log("[rates] No real rates in DB — fetching from external API...")

  const fallbackRates = latest?.rates || null
  const rates = await fetchFromAPI(fallbackRates)

  console.log("[rates] Fetched from API:", rates)

  // Only persist fetched rates if they are actually real.
  // If the API failed and returned fallback defaults, we avoid saving
  // bad data (and an infinite fetch loop) by returning cached rates.
  if (areRatesReal(rates)) {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    await CurrencyRate.findOneAndUpdate(
      { date: today },
      { base: "USD", rates, date: today },
      { new: true, upsert: true }
    )

    return rates
  }

  console.error("[rates] Fetched rates are not real (API may be down).")
  if (latest?.rates) {
    return latest.rates
  }
  return { eur: 1, usd: 1, birr: 1, visa: 1, gbp: 1 }
}
