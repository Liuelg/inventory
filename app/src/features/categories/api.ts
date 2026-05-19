import { fetcher } from "@/lib/api-client";
import type { Category } from "./types";

export const categoryApi = {
  list: () => fetcher<{ success: boolean; data: Category[] }>("/api/categories"),

  get: (id: string) =>
    fetcher<{ success: boolean; data: Category }>(`/api/categories/${id}`),

  create: (name: string) =>
    fetcher<{ success: boolean; data: Category }>("/api/categories", {
      method: "POST",
      body: JSON.stringify({ name }),
    }),

  update: (id: string, name: string) =>
    fetcher<{ success: boolean; data: Category }>(`/api/categories/${id}`, {
      method: "PUT",
      body: JSON.stringify({ name }),
    }),

  delete: (id: string) =>
    fetcher<{ success: boolean; data: Category }>(`/api/categories/${id}`, {
      method: "DELETE",
    }),
};
