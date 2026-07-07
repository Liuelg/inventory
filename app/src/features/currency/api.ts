import { fetcher } from "@/lib/api-client"
import type { CurrencyRateRecord, CurrencyRatePayload } from "./types"

export const currencyApi = {
  getLatest: () =>
    fetcher<{ success: boolean; data: CurrencyRateRecord }>(
      "/api/currency-rates/latest"
    ),

  list: () =>
    fetcher<{ success: boolean; data: CurrencyRateRecord[] }>(
      "/api/currency-rates"
    ),

  update: (payload: CurrencyRatePayload) =>
    fetcher<{ success: boolean; data: CurrencyRateRecord }>(
      "/api/currency-rates",
      {
        method: "POST",
        body: JSON.stringify(payload),
      }
    ),

  sync: () =>
    fetcher<{ success: boolean; data: CurrencyRateRecord; message: string }>(
      "/api/currency-rates/sync",
      {
        method: "POST",
      }
    ),
}
