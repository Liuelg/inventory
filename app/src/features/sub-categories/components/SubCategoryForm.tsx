import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCategories } from "@/features/categories/hooks";
import { useCreateSubCategory, useUpdateSubCategory } from "../hooks";
import type { SubCategory } from "../types";

interface SubCategoryFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing?: SubCategory | null;
  onSuccess?: () => void;
}

export function SubCategoryForm({
  open,
  onOpenChange,
  editing,
  onSuccess,
}: SubCategoryFormProps) {
  const [name, setName] = useState("");
  const [categoryId, setCategoryId] = useState<string>("");
  const { data: categories } = useCategories();
  const create = useCreateSubCategory();
  const update = useUpdateSubCategory();

  useEffect(() => {
    setName(editing?.name ?? "");
    setCategoryId(editing ? editing.categoryId : "");
  }, [editing, open]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !categoryId) return;
    if (editing) {
      update.mutate(
        { id: editing._id, name: name.trim(), categoryId: categoryId },
        { onSuccess: () => onSuccess?.() }
      );
    } else {
      create.mutate(
        { name: name.trim(), categoryId: categoryId },
        { onSuccess: () => onSuccess?.() }
      );
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {editing ? "Edit Sub Category" : "Add Sub Category"}
          </DialogTitle>
          <DialogDescription>
            {editing
              ? "Update the sub-category name and parent category."
              : "Enter a name and select a parent category."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            placeholder="Sub-category name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Select value={categoryId} onValueChange={setCategoryId}>
            <SelectTrigger>
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              {categories?.map((c) => (
                <SelectItem key={c._id} value={c._id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={create.isPending || update.isPending}
            >
              {editing ? "Update" : "Create"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
