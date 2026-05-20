import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { stockApi } from "./api"
import type { StockPayload } from "./types"

export function useStocks() {
  return useQuery({
    queryKey: ["stocks"],
    queryFn: () => stockApi.list(),
  })
}

export function useCreateStock() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (payload: StockPayload) => stockApi.create(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["stocks"] }),
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
    onSuccess: () => qc.invalidateQueries({ queryKey: ["stocks"] }),
  })
}

export function useDeleteStock() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => stockApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["stocks"] }),
  })
}
