import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { goodInApi } from "./api"
import type { GoodInPayload } from "./types"

export function useGoodIns() {
  return useQuery({
    queryKey: ["goodIns"],
    queryFn: () => goodInApi.list(),
  })
}

export function useCreateGoodIn() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (payload: GoodInPayload) => goodInApi.create(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["goodIns"] }),
  })
}

export function useUpdateGoodIn() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string
      payload: Partial<GoodInPayload>
    }) => goodInApi.update(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["goodIns"] }),
  })
}

export function useDeleteGoodIn() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => goodInApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["goodIns"] }),
  })
}
