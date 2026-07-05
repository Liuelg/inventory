import { fetcher } from "@/lib/api-client"
import type { Product, ProductPayload } from "./types"

type DeleteProductResponse = {
  message: string
  deletedProduct: Product
}

export const productApi = {
  list: () => fetcher<Product[]>("/api/products"),

  get: (id: string) => fetcher<Product>(`/api/products/${id}`),

  create: (payload: ProductPayload) =>
    fetcher<Product>("/api/products", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  update: (id: string, payload: Partial<ProductPayload>) =>
    fetcher<Product>(`/api/products/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),

  delete: (id: string) =>
    fetcher<DeleteProductResponse>(`/api/products/${id}`, {
      method: "DELETE",
    }),
}
