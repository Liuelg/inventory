import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { storeApi } from "./api"
import type { StorePayload } from "./types"

export function useStores() {
  return useQuery({
    queryKey: ["stores"],
    queryFn: () => storeApi.list(),
  })
}

export function useStore(id: string) {
  return useQuery({
    queryKey: ["stores", id],
    queryFn: () => storeApi.get(id),
    enabled: !!id,
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

export function useDeleteStoreItem() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: ({ storeId, itemId }: { storeId: string; itemId: string }) =>
      storeApi.deleteItem(storeId, itemId),
    onSuccess: (_, { storeId }) => {
      qc.invalidateQueries({ queryKey: ["stores"] })
      qc.invalidateQueries({ queryKey: ["dashboard", "store", storeId] })
      qc.invalidateQueries({ queryKey: ["dashboard", "daily-sales"] })
    },
  })
}

export function useTestPedsConnection() {
  return useMutation({
    mutationFn: (storeId: string) => storeApi.testPedsConnection(storeId),
  })
}
