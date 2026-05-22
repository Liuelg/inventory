import { fetcher } from "@/lib/api-client"
import type { AccountUser, CreateAccountPayload } from "./types"

export const accountApi = {
  list: () => fetcher<AccountUser[]>("/users"),

  create: (payload: CreateAccountPayload) =>
    fetcher<{ token: string; user: AccountUser }>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  update: (id: string, payload: Partial<CreateAccountPayload>) =>
    fetcher<AccountUser>(`/users/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
}
