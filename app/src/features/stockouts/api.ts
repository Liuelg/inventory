import { fetcher } from "@/lib/api-client"
import type { Stockout, StockoutPayload } from "./types"

type ApiResponse<T> = {
  success: boolean
  data: T
}

type DeleteStockoutResponse = {
  success: boolean
  message: string
}

export const stockoutApi = {
  list: (params?: { store?: string; status?: string }) => {
    const query = params
      ? "?" + new URLSearchParams(params as Record<string, string>).toString()
      : ""
    return fetcher<ApiResponse<Stockout[]>>(`/api/stockouts${query}`)
  },

  get: (id: string) => fetcher<ApiResponse<Stockout>>(`/api/stockouts/${id}`),

  create: (payload: StockoutPayload) =>
    fetcher<ApiResponse<Stockout>>("/api/stockouts", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  update: (id: string, payload: Partial<StockoutPayload>) =>
    fetcher<ApiResponse<Stockout>>(`/api/stockouts/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),

  accept: (id: string, accepted_by: string) =>
    fetcher<ApiResponse<Stockout>>(`/api/stockouts/${id}/accept`, {
      method: "PATCH",
      body: JSON.stringify({ accepted_by }),
    }),

  reject: (id: string) =>
    fetcher<ApiResponse<Stockout>>(`/api/stockouts/${id}/reject`, {
      method: "PATCH",
    }),

  delete: (id: string) =>
    fetcher<DeleteStockoutResponse>(`/api/stockouts/${id}`, {
      method: "DELETE",
    }),
}
