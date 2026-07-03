import { useState } from "react"
import { StoreTable } from "../components/StoreTable"
import { StoreForm } from "../components/StoreForm"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import type { Store } from "../types"

export function StorePage() {
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Store | null>(null)

  const openAdd = () => {
    setEditing(null)
    setFormOpen(true)
  }

  const openEdit = (store: Store) => {
    setEditing(store)
    setFormOpen(true)
  }

  return (
    <div className="flex h-full w-full flex-col gap-4">
      <div className="flex w-full flex-col sm:flex-row items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Stores</h1>
          <p className="text-sm text-gray-500">
            Manage store locations and managers.
          </p>
        </div>
        <Button onClick={openAdd} className="w-full sm:w-auto">
          <Plus data-icon="inline-start" />
          Add Store
        </Button>
      </div>
      <StoreTable onEdit={openEdit} />
      {formOpen ? (
        <StoreForm
          key={editing?._id ?? "new-store"}
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
