import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { productGroupApi } from "./api"
import type { ProductGroupPayload } from "./types"

export function useProductGroups() {
  return useQuery({
    queryKey: ["product-groups"],
    queryFn: () => productGroupApi.list(),
  })
}

export function useCreateProductGroup() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (payload: ProductGroupPayload) => productGroupApi.create(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["product-groups"] })
      qc.invalidateQueries({ queryKey: ["products"] })
    },
  })
}

export function useUpdateProductGroup() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string
      payload: Partial<ProductGroupPayload>
    }) => productGroupApi.update(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["product-groups"] }),
  })
}

export function useDeleteProductGroup() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => productGroupApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["product-groups"] }),
  })
}
