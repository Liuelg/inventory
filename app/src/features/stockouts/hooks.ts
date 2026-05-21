import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { stockoutApi } from "./api"
import type { StockoutPayload } from "./types"

export function useStockouts(params?: { store?: string; status?: string }) {
  return useQuery({
    queryKey: ["stockouts", params],
    queryFn: async () => {
      const res = await stockoutApi.list(params)
      return res.data
    },
  })
}

export function useCreateStockout() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (payload: StockoutPayload) => stockoutApi.create(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["stockouts"] }),
  })
}

export function useUpdateStockout() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string
      payload: Partial<StockoutPayload>
    }) => stockoutApi.update(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["stockouts"] }),
  })
}

export function useAcceptStockout() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: ({ id, accepted_by }: { id: string; accepted_by: string }) =>
      stockoutApi.accept(id, accepted_by),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["stockouts"] })
      qc.invalidateQueries({ queryKey: ["stores"] })
    },
  })
}

export function useRejectStockout() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => stockoutApi.reject(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["stockouts"] }),
  })
}

export function useDeleteStockout() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => stockoutApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["stockouts"] }),
  })
}
