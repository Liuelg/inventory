import { useState } from "react"
import { StockoutTable } from "../components/StockoutTable"
import { StockoutForm } from "../components/StockoutForm"
import { Button } from "@/components/ui/button.tsx"
import { Plus } from "lucide-react"
import type { Stockout } from "../types"

export function StockoutPage() {
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Stockout | null>(null)

  const openAdd = () => {
    setEditing(null)
    setFormOpen(true)
  }

  const openEdit = (stockout: Stockout) => {
    setEditing(stockout)
    setFormOpen(true)
  }

  return (
    <div className="flex h-full w-full flex-col gap-4">
      <div className="flex w-full flex-row items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Stockouts</h1>
          <p className="text-sm text-gray-500">
            Manage stock sent to stores and track acceptances.
          </p>
        </div>
        <Button onClick={openAdd}>
          <Plus data-icon="inline-start" />
          Add Stockout
        </Button>
      </div>
      <StockoutTable onEdit={openEdit} />
      {formOpen ? (
        <StockoutForm
          key={editing?._id ?? "new-stockout"}
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
