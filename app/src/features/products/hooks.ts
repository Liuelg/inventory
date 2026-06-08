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
    mutationFn: (data: ProductPayload | FormData) => {
      if (data instanceof FormData) return productApi.createWithImage(data)
      return productApi.create(data)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["products"] }),
  })
}

export function useUpdateProduct() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string
      data: Partial<ProductPayload> | FormData
    }) => {
      if (data instanceof FormData) return productApi.updateWithImage(id, data)
      return productApi.update(id, data)
    },
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
