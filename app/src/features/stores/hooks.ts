import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { storeApi } from "./api"
import type { StorePayload } from "./types"

export function useStores() {
  return useQuery({
    queryKey: ["stores"],
    queryFn: () => storeApi.list(),
  })
}

export function useCreateStore() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (payload: StorePayload) => storeApi.create(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["stores"] }),
  })
}

export function useUpdateStore() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string
      payload: Partial<StorePayload>
    }) => storeApi.update(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["stores"] }),
  })
}

export function useDeleteStore() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => storeApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["stores"] }),
  })
}
