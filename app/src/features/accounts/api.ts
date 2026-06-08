import { fetcher } from "@/lib/api-client"
import type { AccountUser, CreateAccountPayload } from "./types"

export const accountApi = {
  list: () => fetcher<AccountUser[]>("/api/users"),

  create: (payload: CreateAccountPayload) =>
    fetcher<{ token: string; user: AccountUser }>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  update: (id: string, payload: Partial<CreateAccountPayload>) =>
    fetcher<AccountUser>(`/api/users/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),

  delete: (id: string) =>
    fetcher<{ message: string; deletedUser: AccountUser }>(`/api/users/${id}`, {
      method: "DELETE",
    }),
}
