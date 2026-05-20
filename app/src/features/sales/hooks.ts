import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { saleApi } from "./api"
import type { SalePayload } from "./types"

export function useSales() {
  return useQuery({
    queryKey: ["sales"],
    queryFn: () => saleApi.list(),
  })
}

export function useCreateSale() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (payload: SalePayload) => saleApi.create(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sales"] }),
  })
}

export function useUpdateSale() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string
      payload: Partial<SalePayload>
    }) => saleApi.update(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sales"] }),
  })
}

export function useDeleteSale() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => saleApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sales"] }),
  })
}
