import { fetcher } from "@/lib/api-client"
import type { GoodIn, GoodInPayload } from "./types"

type DeleteGoodInResponse = {
  message: string
}

export const goodInApi = {
  list: () => fetcher<GoodIn[]>("/api/goodIns"),

  get: (id: string) => fetcher<GoodIn>(`/api/goodIns/${id}`),

  create: (payload: GoodInPayload) =>
    fetcher<GoodIn>("/api/goodIns", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  update: (id: string, payload: Partial<GoodInPayload>) =>
    fetcher<GoodIn>(`/api/goodIns/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),

  delete: (id: string) =>
    fetcher<DeleteGoodInResponse>(`/api/goodIns/${id}`, {
      method: "DELETE",
    }),
}
