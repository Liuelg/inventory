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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { DataTable, type ColumnDef } from "@/components/Table.tsx"
import { useCategories, useDeleteCategory } from "../hooks"
import { useSubCategoriesByCategory } from "@/features/sub-categories/hooks"
import type { Category } from "../types"
import { ChevronDown, Pencil, Trash2 } from "lucide-react"

interface CategoryTableProps {
  onEdit: (category: Category) => void
}

function SubCategoryDropdown({ categoryId }: { categoryId: string }) {
  const { data: subCategories, isLoading } = useSubCategoriesByCategory(categoryId)
  const count = subCategories?.length ?? 0

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          {isLoading ? "..." : count}
          <ChevronDown className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-48">
        <DropdownMenuLabel>Sub-categories</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {isLoading ? (
          <DropdownMenuItem disabled>Loading...</DropdownMenuItem>
        ) : subCategories && subCategories.length > 0 ? (
          subCategories.map((sc) => (
            <DropdownMenuItem key={sc._id}>{sc.name}</DropdownMenuItem>
          ))
        ) : (
          <DropdownMenuItem disabled>No sub-categories</DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function CategoryTable({ onEdit }: CategoryTableProps) {
  const { data: categories, isLoading } = useCategories()
  const remove = useDeleteCategory()
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const columns: ColumnDef<Category>[] = [
    { header: "Name", cell: (c) => c.name },
    {
      header: "Sub-categories",
      className: "w-[180px]",
      cell: (c) => <SubCategoryDropdown categoryId={c._id} />,
    },
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
    <div className="flex flex-col gap-4">
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
