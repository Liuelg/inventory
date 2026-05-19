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
import { Plus, Pencil, Trash2 } from "lucide-react"
import { useDeleteProduct, useProducts } from "../hooks"
import { ProductForm } from "./ProductForm"
import type { Product } from "../types"

function formatPrice(product: Product) {
  const amount = product.price?.amount
  if (amount === undefined || Number.isNaN(amount)) {
    return "-"
  }

  const currency = product.price?.currency || "USD"
  return `${amount.toFixed(2)} ${currency}`
}

export function ProductTable() {
  const { data: products, isLoading } = useProducts()
  const remove = useDeleteProduct()

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Product | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  function openAdd() {
    setEditing(null)
    setFormOpen(true)
  }

  function openEdit(product: Product) {
    setEditing(product)
    setFormOpen(true)
  }

  function handleFormSuccess() {
    setFormOpen(false)
    setEditing(null)
  }

  const columns: ColumnDef<Product>[] = [
    {
      header: "Name",
      cell: (product) => (
        <span className="font-medium">{product.name || "-"}</span>
      ),
    },
    {
      header: "Category",
      cell: (product) => product.category || "-",
    },
    {
      header: "Price",
      cell: (product) => formatPrice(product),
      className: "whitespace-nowrap",
    },
    {
      header: "Tags",
      cell: (product) =>
        product.tags?.length ? product.tags.join(", ") : "-",
    },
    {
      header: "Actions",
      className: "w-[120px] text-right",
      cell: (product) => (
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={() => openEdit(product)}>
            <Pencil />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive"
            onClick={() => setDeleteId(product._id)}
          >
            <Trash2 />
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-4">
      <div className="flex justify-end">
        <Button onClick={openAdd}>
          <Plus data-icon="inline-start" />
          Add Product
        </Button>
      </div>

      <DataTable
        data={products ?? []}
        columns={columns}
        keyExtractor={(product) => product._id}
        loading={isLoading}
        emptyMessage="No products found."
      />

      {formOpen ? (
        <ProductForm
          key={editing?._id ?? "new-product"}
          open={formOpen}
          onOpenChange={setFormOpen}
          editing={editing}
          onSuccess={handleFormSuccess}
        />
      ) : null}

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
    </div>
  )
}
