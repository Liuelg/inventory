import { useState } from "react"
import { SalesTable } from "../components/SalesTable"
import { SalesForm } from "../components/SalesForm"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import type { Sale } from "../types"

export function SalesPage() {
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Sale | null>(null)

  const openAdd = () => {
    setEditing(null)
    setFormOpen(true)
  }

  const openEdit = (sale: Sale) => {
    setEditing(sale)
    setFormOpen(true)
  }

  return (
    <div className="flex h-full w-full flex-col gap-4">
      <div className="flex w-full flex-col sm:flex-row items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Sales</h1>
          <p className="text-sm text-gray-500">Manage sales and invoices.</p>
        </div>
        <Button onClick={openAdd} className="w-full sm:w-auto">
          <Plus data-icon="inline-start" />
          Add Sale
        </Button>
      </div>
      <SalesTable onEdit={openEdit} />
      {formOpen ? (
        <SalesForm
          key={editing?._id ?? "new-sale"}
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
