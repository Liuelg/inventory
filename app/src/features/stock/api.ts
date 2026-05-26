import { fetcher } from "@/lib/api-client"
import type { Stock, StockPayload } from "./types"

type DeleteStockResponse = {
  message: string
}

export type AvailableStockItem = {
  product: { _id: string; name: string }
  available: number
}

export const stockApi = {
  list: () => fetcher<Stock[]>("/api/stock"),

  available: () =>
    fetcher<{ success: boolean; data: AvailableStockItem[] }>(
      "/api/stock/available"
    ),

  get: (id: string) => fetcher<Stock>(`/api/stock/${id}`),

  create: (payload: StockPayload) =>
    fetcher<Stock>("/api/stock", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  update: (id: string, payload: Partial<StockPayload>) =>
    fetcher<Stock>(`/api/stock/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),

  delete: (id: string) =>
    fetcher<DeleteStockResponse>(`/api/stock/${id}`, {
      method: "DELETE",
    }),
}
