import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { DataTable, type ColumnDef } from "@/components/Table.tsx"
import { useCategories, useDeleteCategory } from "../hooks"
import type { Category } from "../types"
import { Pencil, Trash2 } from "lucide-react"

interface CategoryTableProps {
  onEdit: (category: Category) => void
}

export function CategoryTable({ onEdit }: CategoryTableProps) {
  const { data: categories, isLoading } = useCategories()
  const remove = useDeleteCategory()
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const columns: ColumnDef<Category>[] = [
    
    { header: "Name", cell: (c) => c.name },
    {
      header: "Actions",
      className: "w-[120px] text-right",
      cell: (c) => (
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={() => onEdit(c)}>
            <Pencil />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive"
            onClick={() => setDeleteId(c._id)}
          >
            <Trash2 />
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-4">
      <DataTable
        data={categories ?? []}
        columns={columns}
        keyExtractor={(c) => c._id}
        loading={isLoading}
        emptyMessage="No categories found."
      />

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the category and all its
              sub-categories.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteId(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deleteId) remove.mutate(deleteId)
                setDeleteId(null)
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
