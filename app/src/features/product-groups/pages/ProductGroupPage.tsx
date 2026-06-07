import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { ProductGroupTable } from "../components/ProductGroupTable"
import { ProductGroupForm } from "../components/ProductGroupForm"
import type { ProductGroup } from "../types"

export function ProductGroupPage() {
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<ProductGroup | null>(null)

  function handleEdit(group: ProductGroup) {
    setEditing(group)
    setFormOpen(true)
  }

  function handleSuccess() {
    setFormOpen(false)
    setEditing(null)
  }

  return (
    <div className="flex h-full w-full flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Product Groups</h1>
        <Button onClick={() => setFormOpen(true)}>
          <Plus className="mr-1 h-4 w-4" />
          Add Group
        </Button>
      </div>

      <ProductGroupTable onEdit={handleEdit} />

      <ProductGroupForm
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open)
          if (!open) setEditing(null)
        }}
        editing={editing}
        onSuccess={handleSuccess}
      />
    </div>
  )
}
