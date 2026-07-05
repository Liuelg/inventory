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
    mutationFn: (payload: SalePayload | FormData) => {
      if (payload instanceof FormData) return saleApi.createWithImages(payload)
      return saleApi.create(payload)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sales"] })
      qc.invalidateQueries({ queryKey: ["stores"] })
      qc.invalidateQueries({ queryKey: ["dashboard"] })
    },
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
      payload: Partial<SalePayload> | FormData
    }) => {
      if (payload instanceof FormData) return saleApi.updateWithImages(id, payload)
      return saleApi.update(id, payload)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sales"] })
      qc.invalidateQueries({ queryKey: ["stores"] })
      qc.invalidateQueries({ queryKey: ["dashboard"] })
    },
  })
}

export function useDeleteSale() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => saleApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sales"] })
      qc.invalidateQueries({ queryKey: ["stores"] })
      qc.invalidateQueries({ queryKey: ["dashboard"] })
    },
  })
}
