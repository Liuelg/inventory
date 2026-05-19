import { fetcher } from "@/lib/api-client"
import type { Store, StorePayload } from "./types"

type DeleteStoreResponse = {
  message: string
}

export const storeApi = {
  list: () => fetcher<Store[]>("/stores"),

  get: (id: string) => fetcher<Store>(`/stores/${id}`),

  create: (payload: StorePayload) =>
    fetcher<Store>("/stores", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  update: (id: string, payload: Partial<StorePayload>) =>
    fetcher<Store>(`/stores/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),

  delete: (id: string) =>
    fetcher<DeleteStoreResponse>(`/stores/${id}`, {
      method: "DELETE",
    }),
}
