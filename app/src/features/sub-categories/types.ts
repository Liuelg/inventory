import type { Category } from "@/features/categories/types";

export type SubCategory = {
  _id: string;
  name: string;
  categoryId: string;
  createdAt: string | null;
  category?: Category;
};
