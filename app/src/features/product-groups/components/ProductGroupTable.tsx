import { useState } from "react"
import { DataTable, type ColumnDef } from "@/components/Table.tsx"
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
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog"
import { Pencil, Trash2 } from "lucide-react"
import { useAuthSession } from "@/hooks/use-auth-session"
import { useDeleteProductGroup, useProductGroups } from "../hooks"
import type { ProductGroup } from "../types"

interface ProductGroupTableProps {
  onEdit: (group: ProductGroup) => void
}

export function ProductGroupTable({ onEdit }: ProductGroupTableProps) {
  const { data: groups, isLoading } = useProductGroups()
  const { data: session } = useAuthSession()
  const isAdmin = session?.role === "admin"
  const remove = useDeleteProductGroup()
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [previewGroup, setPreviewGroup] = useState<ProductGroup | null>(null)

  const columns: ColumnDef<ProductGroup>[] = [
    {
      header: "Image",
      className: "w-[72px]",
      cell: (group) =>
        group.image ? (
          <button
            type="button"
            onClick={() => setPreviewGroup(group)}
            className="cursor-zoom-in"
          >
            <img
              src={group.image}
              alt={group.name}
              className="h-10 w-10 rounded-md object-cover border"
            />
          </button>
        ) : (
          <div className="h-10 w-10 rounded-md border bg-muted" />
        ),
    },
    {
      header: "Name",
      cell: (group) => (
        <span className="font-medium">{group.name || "-"}</span>
      ),
    },
    {
      header: "Category",
      cell: (group) =>
        typeof group.category === "string"
          ? group.category || "-"
          : group.category?.name || "-",
    },
    {
      header: "Products",
      cell: (group) =>
        `${group.items?.length || 0} product${group.items?.length === 1 ? "" : "s"}`,
    },
    {
      header: "Actions",
      className: "w-[120px] text-right",
      cell: (group) => (
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={() => onEdit(group)}>
            <Pencil />
          </Button>
          {isAdmin && (
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive"
              onClick={() => setDeleteId(group._id)}
            >
              <Trash2 />
            </Button>
          )}
        </div>
      ),
    },
  ]

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-4">
      <DataTable
        data={groups ?? []}
        columns={columns}
        keyExtractor={(group) => group._id}
        loading={isLoading}
        emptyMessage="No product groups found."
      />

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action permanently deletes this product group.
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

      <Dialog open={!!previewGroup} onOpenChange={() => setPreviewGroup(null)}>
        <DialogContent className="max-w-3xl p-0 overflow-hidden">
          <DialogTitle className="sr-only">
            {previewGroup?.name ?? "Product group image"}
          </DialogTitle>
          {previewGroup?.image ? (
            <img
              src={previewGroup.image}
              alt={previewGroup.name}
              className="w-full h-auto max-h-[80vh] object-contain"
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  )
}
