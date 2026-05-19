import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useCreateCategory, useUpdateCategory } from "../hooks";
import type { Category } from "../types";

interface CategoryFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing?: Category | null;
  onSuccess?: () => void;
}

export function CategoryForm({
  open,
  onOpenChange,
  editing,
  onSuccess,
}: CategoryFormProps) {
  const [name, setName] = useState("");
  const create = useCreateCategory();
  const update = useUpdateCategory();

  useEffect(() => {
    setName(editing?.name ?? "");
  }, [editing, open]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    if (editing) {
      update.mutate(
        { id: editing._id, name: name.trim() },
        { onSuccess: () => onSuccess?.() }
      );
    } else {
      create.mutate(name.trim(), { onSuccess: () => onSuccess?.() });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {editing ? "Edit Category" : "Add Category"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            placeholder="Category name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={create.isPending || update.isPending}>
              {editing ? "Update" : "Create"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
