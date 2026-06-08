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

  createWithImage: (formData: FormData) =>
    fetcher<Product>("/products", {
      method: "POST",
      body: formData,
    }),

  update: (id: string, payload: Partial<ProductPayload>) =>
    fetcher<Product>(`/products/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),

  updateWithImage: (id: string, formData: FormData) =>
    fetcher<Product>(`/products/${id}`, {
      method: "PATCH",
      body: formData,
    }),

  delete: (id: string) =>
    fetcher<DeleteProductResponse>(`/products/${id}`, {
      method: "DELETE",
    }),
}
