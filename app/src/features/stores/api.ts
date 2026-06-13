import { fetcher } from "@/lib/api-client"
import type { Store, StorePayload } from "./types"

type DeleteStoreResponse = {
  message: string
}

export const storeApi = {
  list: () => fetcher<Store[]>("/api/stores"),

  get: (id: string) => fetcher<Store>(`/api/stores/${id}`),

  create: (payload: StorePayload) =>
    fetcher<Store>("/api/stores", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  update: (id: string, payload: Partial<StorePayload>) =>
    fetcher<Store>(`/api/stores/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),

  delete: (id: string) =>
    fetcher<DeleteStoreResponse>(`/api/stores/${id}`, {
      method: "DELETE",
    }),

  deleteItem: (storeId: string, itemId: string) =>
    fetcher<{ success: boolean; message: string }>(`/api/stores/${storeId}/items/${itemId}`, {
      method: "DELETE",
    }),
}
