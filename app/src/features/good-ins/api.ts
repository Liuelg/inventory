import { fetcher } from "@/lib/api-client"
import type { GoodIn, GoodInPayload } from "./types"

type DeleteGoodInResponse = {
  message: string
}

export const goodInApi = {
  list: () => fetcher<GoodIn[]>("/goodIns"),

  get: (id: string) => fetcher<GoodIn>(`/goodIns/${id}`),

  create: (payload: GoodInPayload) =>
    fetcher<GoodIn>("/goodIns", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  update: (id: string, payload: Partial<GoodInPayload>) =>
    fetcher<GoodIn>(`/goodIns/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),

  delete: (id: string) =>
    fetcher<DeleteGoodInResponse>(`/goodIns/${id}`, {
      method: "DELETE",
    }),
}
