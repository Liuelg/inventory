import { fetcher } from "@/lib/api-client"
import type { Sale, SalePayload } from "./types"

type DeleteSaleResponse = {
  message: string
  deletedSale: Sale
}

export const saleApi = {
  list: () => fetcher<Sale[]>("/api/sales"),

  get: (id: string) => fetcher<Sale>(`/api/sales/${id}`),

  create: (payload: SalePayload) =>
    fetcher<Sale>("/api/sales", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  createWithImages: (formData: FormData) =>
    fetcher<Sale>("/api/sales", {
      method: "POST",
      body: formData,
    }),

  update: (id: string, payload: Partial<SalePayload>) =>
    fetcher<Sale>(`/api/sales/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),

  updateWithImages: (id: string, formData: FormData) =>
    fetcher<Sale>(`/api/sales/${id}`, {
      method: "PATCH",
      body: formData,
    }),

  delete: (id: string) =>
    fetcher<DeleteSaleResponse>(`/api/sales/${id}`, {
      method: "DELETE",
    }),
}
