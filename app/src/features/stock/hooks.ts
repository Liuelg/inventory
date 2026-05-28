import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { stockApi } from "./api"
import type { StockPayload } from "./types"

function invalidateStockRelated(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ["stocks"] })
  qc.invalidateQueries({ queryKey: ["stock", "available"] })
}

export function useStocks() {
  return useQuery({
    queryKey: ["stocks"],
    queryFn: () => stockApi.list(),
  })
}

export function useAvailableStock() {
  return useQuery({
    queryKey: ["stock", "available"],
    queryFn: () => stockApi.available(),
  })
}

export function useCreateStock() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (payload: StockPayload) => stockApi.create(payload),
    onSuccess: () => invalidateStockRelated(qc),
  })
}

export function useUpdateStock() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string
      payload: Partial<StockPayload>
    }) => stockApi.update(id, payload),
    onSuccess: () => invalidateStockRelated(qc),
  })
}

export function useDeleteStock() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => stockApi.delete(id),
    onSuccess: () => invalidateStockRelated(qc),
  })
}
