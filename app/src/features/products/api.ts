import { fetcher } from "@/lib/api-client"
import type { Product, ProductPayload } from "./types"

type DeleteProductResponse = {
  message: string
  deletedProduct: Product
}

export const productApi = {
  list: () => fetcher<Product[]>("/products"),

  get: (id: string) => fetcher<Product>(`/products/${id}`),

  create: (payload: ProductPayload) =>
    fetcher<Product>("/products", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  update: (id: string, payload: Partial<ProductPayload>) =>
    fetcher<Product>(`/products/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),

  delete: (id: string) =>
    fetcher<DeleteProductResponse>(`/products/${id}`, {
      method: "DELETE",
    }),
}
