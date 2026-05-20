import { fetcher } from "@/lib/api-client"
import type { Sale, SalePayload } from "./types"

type DeleteSaleResponse = {
  message: string
  deletedSale: Sale
}

export const saleApi = {
  list: () => fetcher<Sale[]>("/sales"),

  get: (id: string) => fetcher<Sale>(`/sales/${id}`),

  create: (payload: SalePayload) =>
    fetcher<Sale>("/sales", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  update: (id: string, payload: Partial<SalePayload>) =>
    fetcher<Sale>(`/sales/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),

  delete: (id: string) =>
    fetcher<DeleteSaleResponse>(`/sales/${id}`, {
      method: "DELETE",
    }),
}
