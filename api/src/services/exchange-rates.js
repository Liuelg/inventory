const EXCHANGE_RATE_API_URL = "https://api.exchangerate-api.com/v4/latest/USD"
const FRANKFURTER_BASE_URL = "https://api.frankfurter.app"

/**
 * Fetch latest exchange rates from exchangerate-api.com (primary).
 * Supports ETB (Ethiopian Birr), EUR, USD and many others.
 * Falls back to Frankfurter if the primary API fails.
 *
 * @param {object} fallbackRates - existing rates to use as final fallback
 * @returns {Promise<{eur:number, usd:number, birr:number, visa:number}>}
 */
export async function fetchLatestRates(fallbackRates = null) {
  const safeFallback = {
    eur: fallbackRates?.eur > 0 ? fallbackRates.eur : 1,
    usd: fallbackRates?.usd > 0 ? fallbackRates.usd : 1,
    birr: fallbackRates?.birr > 0 ? fallbackRates.birr : 1,
    visa: fallbackRates?.visa > 0 ? fallbackRates.visa : 1,
  }

  // Try primary source: exchangerate-api.com (supports ETB)
  try {
    const response = await fetch(EXCHANGE_RATE_API_URL)
    if (response.ok) {
      const data = await response.json()
      const rates = {
        eur: data.rates?.EUR || safeFallback.eur,
        usd: 1, // base is USD
        birr: data.rates?.ETB || safeFallback.birr,
        visa: 1, // Visa is treated as USD
      }
      return rates
    }
  } catch (err) {
    console.error("[exchange-rates] Primary API failed:", err.message)
  }

  // Fallback: Frankfurter (no ETB, but has EUR)
  try {
    const response = await fetch(
      `${FRANKFURTER_BASE_URL}/latest?from=USD&to=EUR`
    )
    if (response.ok) {
      const data = await response.json()
      const rates = {
        eur: data.rates?.EUR || safeFallback.eur,
        usd: 1,
        birr: safeFallback.birr, // Frankfurter doesn't support ETB
        visa: 1,
      }
      return rates
    }
  } catch (err) {
    console.error("[exchange-rates] Fallback API failed:", err.message)
  }

  // Final fallback: use whatever we already have stored
  return safeFallback
}
