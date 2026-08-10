export type CurrencyCode = "eur" | "usd" | "birr" | "visa" | "gbp"

export type CurrencyRates = {
  eur: number
  usd: number
  birr: number
  visa: number
  gbp: number
}

export type CurrencyRateRecord = {
  _id: string
  base: string
  rates: CurrencyRates
  date: string
  createdAt?: string
  updatedAt?: string
}

export type CurrencyRatePayload = {
  base?: string
  rates: Partial<CurrencyRates>
}
