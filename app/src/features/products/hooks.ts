import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { productApi } from "./api"
import type { ProductPayload } from "./types"

export function useProducts() {
  return useQuery({
    queryKey: ["products"],
    queryFn: () => productApi.list(),
  })
}

export function useCreateProduct() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (payload: ProductPayload) => productApi.create(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["products"] }),
  })
}

export function useUpdateProduct() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string
      payload: Partial<ProductPayload>
    }) => productApi.update(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["products"] }),
  })
}

export function useDeleteProduct() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => productApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["products"] }),
  })
}
