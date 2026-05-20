import { useState } from "react"
import { ProductTable } from "../components/ProductTable"
import { ProductForm } from "../components/ProductForm"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import type { Product } from "../types"

export function ProductPage() {
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Product | null>(null)

  const openAdd = () => {
    setEditing(null)
    setFormOpen(true)
  }

  const openEdit = (product: Product) => {
    setEditing(product)
    setFormOpen(true)
  }

  return (
    <div className="flex h-full w-full flex-col gap-4">
      <div className="flex w-full flex-row items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Products</h1>
          <p className="text-sm text-gray-500">Manage products and pricing.</p>
        </div>
        <Button onClick={openAdd}>
          <Plus data-icon="inline-start" />
          Add Product
        </Button>
      </div>
      <ProductTable onEdit={openEdit} />
      {formOpen ? (
        <ProductForm
          key={editing?._id ?? "new-product"}
          open={formOpen}
          onOpenChange={setFormOpen}
          editing={editing}
          onSuccess={() => {
            setFormOpen(false)
            setEditing(null)
          }}
        />
      ) : null}
    </div>
  )
}
