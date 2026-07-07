const FRANKFURTER_BASE_URL = "https://api.frankfurter.app"

const CURRENCY_MAP = {
  eur: "EUR",
  usd: "USD",
  birr: "ETB",
  visa: "USD",
}

/**
 * Fetch latest exchange rates from Frankfurter API (relative to USD).
 * Falls back gracefully if the API is down or a currency is unavailable.
 *
 * @param {object} fallbackRates - existing rates to use as fallback
 * @returns {Promise<{eur:number, usd:number, birr:number, visa:number}>}
 */
export async function fetchLatestRates(fallbackRates = null) {
  const symbols = Object.values(CURRENCY_MAP)
    .filter((v, i, arr) => arr.indexOf(v) === i) // unique
    .join(",")

  const url = `${FRANKFURTER_BASE_URL}/latest?from=USD&to=${symbols}`

  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Frankfurter API error: ${response.status} ${response.statusText}`)
  }

  const data = await response.json()

  const safeFallback = {
    eur: fallbackRates?.eur || 1,
    usd: fallbackRates?.usd || 1,
    birr: fallbackRates?.birr || 1,
    visa: fallbackRates?.visa || 1,
  }

  const rates = {
    eur: data.rates?.EUR || safeFallback.eur,
    usd: 1, // base is USD
    birr: data.rates?.ETB || safeFallback.birr,
    visa: 1, // Visa is treated as USD
  }

  return rates
}
