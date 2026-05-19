import { fetcher } from "@/lib/api-client";
import type { SubCategory } from "./types";

export const subCategoryApi = {
  list: () =>
    fetcher<{ success: boolean; data: SubCategory[] }>("/api/sub-categories"),

  get: (id: string) =>
    fetcher<{ success: boolean; data: SubCategory }>(`/api/sub-categories/${id}`),

  listByCategory: (categoryId: string) =>
    fetcher<{ success: boolean; data: SubCategory[] }>(
      `/api/sub-categories/category/${categoryId}`
    ),

  create: (name: string, categoryId: string) =>
    fetcher<{ success: boolean; data: SubCategory }>("/api/sub-categories", {
      method: "POST",
      body: JSON.stringify({ name, categoryId }),
    }),

  update: (id: string, name: string, categoryId: string) =>
    fetcher<{ success: boolean; data: SubCategory }>(`/api/sub-categories/${id}`, {
      method: "PUT",
      body: JSON.stringify({ name, categoryId }),
    }),

  delete: (id: string) =>
    fetcher<{ success: boolean; data: SubCategory }>(`/api/sub-categories/${id}`, {
      method: "DELETE",
    }),
};
