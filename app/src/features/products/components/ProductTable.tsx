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
import { useDeleteProduct } from "../hooks"
import { getProductImageUrl } from "../utils"
import type { Product } from "../types"

function formatPrice(product: Product) {
  const amount = product.price?.amount
  if (amount === undefined || Number.isNaN(amount)) {
    return "-"
  }

  const currency = product.price?.currency || "USD"
  return `${amount.toFixed(2)} ${currency}`
}

interface ProductTableProps {
  products: Product[]
  isLoading?: boolean
  onEdit: (product: Product) => void
}

export function ProductTable({ products, isLoading, onEdit }: ProductTableProps) {
  const { data: session } = useAuthSession()
  const isAdmin = session?.role === "admin"
  const remove = useDeleteProduct()
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [previewProduct, setPreviewProduct] = useState<Product | null>(null)

  const columns: ColumnDef<Product>[] = [
    {
      header: "Image",
      className: "w-[72px]",
      cell: (product) => {
        const src = getProductImageUrl(product.image)
        return src ? (
          <button
            type="button"
            onClick={() => setPreviewProduct(product)}
            className="cursor-zoom-in"
          >
            <img
              src={src}
              alt={product.name}
              className="h-10 w-10 rounded-md object-cover border"
            />
          </button>
        ) : (
          <div className="h-10 w-10 rounded-md border bg-muted" />
        )
      },
    },
    {
      header: "Name",
      cell: (product) => (
        <span className="font-medium">{product.name || "-"}</span>
      ),
    },
    {
      header: "Category",
      cell: (product) =>
        typeof product.category === "string"
          ? product.category || "-"
          : product.category?.name || "-",
    },
    {
      header: "Sub Category",
      cell: (product) =>
        typeof product.subCategory === "string"
          ? product.subCategory || "-"
          : product.subCategory?.name || "-",
    },
    {
      header: "Price",
      cell: (product) => formatPrice(product),
      className: "whitespace-nowrap",
    },
    {
      header: "Actions",
      className: "w-[120px] text-right",
      cell: (product) => (
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={() => onEdit(product)}>
            <Pencil />
          </Button>
          {isAdmin && (
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive"
              onClick={() => setDeleteId(product._id)}
            >
              <Trash2 />
            </Button>
          )}
        </div>
      ),
    },
  ]

  return (
    <div className="flex flex-col gap-4">
      <DataTable
        data={products}
        columns={columns}
        keyExtractor={(product) => product._id}
        loading={isLoading}
        emptyMessage="No products found."
      />

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action permanently deletes this product.
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

      <Dialog open={!!previewProduct} onOpenChange={() => setPreviewProduct(null)}>
        <DialogContent className="max-w-3xl p-0 overflow-hidden">
          <DialogTitle className="sr-only">
            {previewProduct?.name ?? "Product image"}
          </DialogTitle>
          {previewProduct?.image ? (
            <img
              src={getProductImageUrl(previewProduct.image)}
              alt={previewProduct.name}
              className="w-full h-auto max-h-[80vh] object-contain"
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  )
}
