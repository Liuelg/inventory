import { fetcher } from "@/lib/api-client"
import type { Stock, StockPayload } from "./types"

type DeleteStockResponse = {
  message: string
}

export const stockApi = {
  list: () => fetcher<Stock[]>("/api/stock"),

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
