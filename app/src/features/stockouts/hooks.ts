import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { stockoutApi } from "./api"
import type { StockoutPayload } from "./types"

function invalidateStockoutRelated(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ["stockouts"] })
  qc.invalidateQueries({ queryKey: ["stores"] })
  qc.invalidateQueries({ queryKey: ["dashboard"] })
}

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
    onSuccess: () => invalidateStockoutRelated(qc),
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
    onSuccess: () => invalidateStockoutRelated(qc),
  })
}

export function useAcceptStockout() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: ({ id, accepted_by }: { id: string; accepted_by: string }) =>
      stockoutApi.accept(id, accepted_by),
    onSuccess: () => invalidateStockoutRelated(qc),
  })
}

export function useRejectStockout() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => stockoutApi.reject(id),
    onSuccess: () => invalidateStockoutRelated(qc),
  })
}

export function useDeleteStockout() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => stockoutApi.delete(id),
    onSuccess: () => invalidateStockoutRelated(qc),
  })
}
