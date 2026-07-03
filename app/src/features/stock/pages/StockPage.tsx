import { useState } from "react"
import { StockTable } from "../components/StockTable"
import { StockForm } from "../components/StockForm"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import type { Stock } from "../types"

export function StockPage() {
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Stock | null>(null)

  const openAdd = () => {
    setEditing(null)
    setFormOpen(true)
  }

  const openEdit = (stock: Stock) => {
    setEditing(stock)
    setFormOpen(true)
  }

  return (
    <div className="flex h-full w-full flex-col gap-4">
      <div className="flex w-full flex-col sm:flex-row items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Stock</h1>
          <p className="text-sm text-gray-500">
            Record products received from the workshop.
          </p>
        </div>
        <Button onClick={openAdd} className="w-full sm:w-auto">
          <Plus data-icon="inline-start" />
          Add Stock
        </Button>
      </div>
      <StockTable onEdit={openEdit} />
      {formOpen ? (
        <StockForm
          key={editing?._id ?? "new-stock"}
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
