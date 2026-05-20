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
import { useSubCategories, useDeleteSubCategory } from "../hooks"
import type { SubCategory } from "../types"
import { Pencil, Trash2 } from "lucide-react"

interface SubCategoryTableProps {
  onEdit: (subCategory: SubCategory) => void
}

export function SubCategoryTable({ onEdit }: SubCategoryTableProps) {
  const { data: subCategories, isLoading } = useSubCategories()
  const remove = useDeleteSubCategory()
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const columns: ColumnDef<SubCategory>[] = [
    {
      header: "ID",
      cell: (sc) => <span className="font-medium">{sc._id}</span>,
      className: "w-[80px]",
    },
    { header: "Name", cell: (sc) => sc.name },
    { header: "Category", cell: (sc) => sc.category?.name ?? "—" },
    {
      header: "Actions",
      className: "w-[120px] text-right",
      cell: (sc) => (
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={() => onEdit(sc)}>
            <Pencil />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive"
            onClick={() => setDeleteId(sc._id)}
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
        data={subCategories ?? []}
        columns={columns}
        keyExtractor={(sc) => sc._id}
        loading={isLoading}
        emptyMessage="No sub-categories found."
      />

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this sub-category.
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
