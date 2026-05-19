import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { subCategoryApi } from "./api";

export function useSubCategories() {
  return useQuery({
    queryKey: ["sub-categories"],
    queryFn: async () => {
      const res = await subCategoryApi.list();
      return res.data;
    },
  });
}

export function useCreateSubCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      name,
      categoryId,
    }: {
      name: string;
      categoryId: string;
    }) => subCategoryApi.create(name, categoryId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sub-categories"] });
      qc.invalidateQueries({ queryKey: ["categories"] });
    },
  });
}

export function useUpdateSubCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      name,
      categoryId,
    }: {
      id: string;
      name: string;
      categoryId: string;
    }) => subCategoryApi.update(id, name, categoryId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sub-categories"] });
      qc.invalidateQueries({ queryKey: ["categories"] });
    },
  });
}

export function useDeleteSubCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => subCategoryApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sub-categories"] });
      qc.invalidateQueries({ queryKey: ["categories"] });
    },
  });
}
