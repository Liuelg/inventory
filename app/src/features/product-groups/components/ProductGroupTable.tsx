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
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Pencil, Trash2, Eye } from "lucide-react"
import { useAuthSession } from "@/hooks/use-auth-session"
import { useDeleteProductGroup, useProductGroups } from "../hooks"
import type { ProductGroup, ProductGroupItem } from "../types"

interface ProductGroupTableProps {
  onEdit: (group: ProductGroup) => void
}

function getName(
  value: string | { _id: string; name?: string } | undefined | null
): string {
  if (!value) return "-"
  if (typeof value === "string") return value || "-"
  return value.name || "-"
}

function ProductDetailRow({ item }: { item: ProductGroupItem }) {
  const product =
    typeof item.product === "object"
      ? item.product
      : { _id: item.product as string }

  return (
    <div className="flex items-center gap-3 py-2 border-b last:border-b-0">
      {product.image ? (
        <img
          src={product.image}
          alt={product.name ?? "Product"}
          className="h-10 w-10 rounded-md object-cover border shrink-0"
        />
      ) : (
        <div className="h-10 w-10 rounded-md border bg-muted shrink-0" />
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">
          {product.name || "Unnamed product"}
        </p>
        <p className="text-xs text-muted-foreground">
          {getName(product.category)}
          {product.subCategory ? (
            <> &rsaquo; {getName(product.subCategory)}</>
          ) : null}
        </p>
      </div>
      <span className="text-sm font-medium text-muted-foreground shrink-0">
        x{item.quantity}
      </span>
    </div>
  )
}

export function ProductGroupTable({ onEdit }: ProductGroupTableProps) {
  const { data: groups, isLoading } = useProductGroups()
  const { data: session } = useAuthSession()
  const isAdmin = session?.role === "admin"
  const remove = useDeleteProductGroup()
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [previewGroup, setPreviewGroup] = useState<ProductGroup | null>(null)
  const [detailGroup, setDetailGroup] = useState<ProductGroup | null>(null)

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
      cell: (group) => (
        <button
          type="button"
          onClick={() => setDetailGroup(group)}
          className="text-sm text-primary hover:underline"
        >
          {group.items?.length || 0} product
          {group.items?.length === 1 ? "" : "s"}
        </button>
      ),
    },
    {
      header: "Actions",
      className: "w-[140px] text-right",
      cell: (group) => (
        <div className="flex justify-end gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setDetailGroup(group)}
          >
            <Eye className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => onEdit(group)}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          {isAdmin && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive"
              onClick={() => setDeleteId(group._id)}
            >
              <Trash2 className="h-4 w-4" />
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

      {/* Image preview */}
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

      {/* Product detail */}
      <Dialog open={!!detailGroup} onOpenChange={() => setDetailGroup(null)}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>{detailGroup?.name ?? "Product Group"}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-1 mt-2">
            {detailGroup?.items.map((item, idx) => (
              <ProductDetailRow key={idx} item={item} />
            ))}
            {(!detailGroup?.items || detailGroup.items.length === 0) && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No products in this group.
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
