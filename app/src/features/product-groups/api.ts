import { fetcher } from "@/lib/api-client"
import type { ProductGroup, ProductGroupPayload } from "./types"

type DeleteResponse = {
  message: string
}

export const productGroupApi = {
  list: () => fetcher<ProductGroup[]>("/api/product-groups"),

  get: (id: string) => fetcher<ProductGroup>(`/api/product-groups/${id}`),

  create: (payload: ProductGroupPayload) =>
    fetcher<ProductGroup>("/api/product-groups", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  update: (id: string, payload: Partial<ProductGroupPayload>) =>
    fetcher<ProductGroup>(`/api/product-groups/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),

  delete: (id: string) =>
    fetcher<DeleteResponse>(`/api/product-groups/${id}`, {
      method: "DELETE",
    }),
}
