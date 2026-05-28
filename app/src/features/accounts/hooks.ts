import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { accountApi } from "./api"
import type { CreateAccountPayload } from "./types"

export function useAccounts() {
  return useQuery({
    queryKey: ["accounts"],
    queryFn: () => accountApi.list(),
  })
}

export function useCreateAccount() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (payload: CreateAccountPayload) => accountApi.create(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["accounts"] }),
  })
}

export function useUpdateAccount() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string
      payload: Partial<CreateAccountPayload>
    }) => accountApi.update(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["accounts"] }),
  })
}

export function useDeleteAccount() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => accountApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["accounts"] }),
  })
}
