import { useState } from "react"
import { ProductTable } from "../components/ProductTable"
import { ProductForm } from "../components/ProductForm"
import { ProductGroupForm } from "@/features/product-groups/components/ProductGroupForm"
import { Button } from "@/components/ui/button"
import { Plus, Layers } from "lucide-react"
import { useProducts } from "../hooks"
import type { Product } from "../types"

export function ProductPage() {
  const [formOpen, setFormOpen] = useState(false)
  const [groupFormOpen, setGroupFormOpen] = useState(false)
  const [editing, setEditing] = useState<Product | null>(null)
  const { data: products } = useProducts()

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
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">Products</h1>
            {products ? (
              <span className="rounded-full bg-muted px-2.5 py-0.5 text-sm font-medium text-muted-foreground">
                {products.length}
              </span>
            ) : null}
          </div>
          <p className="text-sm text-gray-500">Manage products and pricing.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setGroupFormOpen(true)}>
            <Layers className="mr-1 h-4 w-4" />
            Create Group
          </Button>
          <Button onClick={openAdd}>
            <Plus data-icon="inline-start" />
            Add Product
          </Button>
        </div>
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
      <ProductGroupForm
        open={groupFormOpen}
        onOpenChange={setGroupFormOpen}
        onSuccess={() => setGroupFormOpen(false)}
      />
    </div>
  )
}
