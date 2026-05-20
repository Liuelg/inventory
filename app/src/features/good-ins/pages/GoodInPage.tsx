import { useState } from "react"
import { GoodInTable } from "../components/GoodInTable"
import { GoodInForm } from "../components/GoodInForm"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import type { GoodIn } from "../types"

export function GoodInPage() {
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<GoodIn | null>(null)

  const openAdd = () => {
    setEditing(null)
    setFormOpen(true)
  }

  const openEdit = (goodIn: GoodIn) => {
    setEditing(goodIn)
    setFormOpen(true)
  }

  return (
    <div className="flex h-full w-full flex-col gap-4">
      <div className="flex w-full flex-row items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Stock In</h1>
          <p className="text-sm text-gray-500">
            Manage goods received and stock entries.
          </p>
        </div>
        <Button onClick={openAdd}>
          <Plus data-icon="inline-start" />
          Add Stock In
        </Button>
      </div>
      <GoodInTable onEdit={openEdit} />
      {formOpen ? (
        <GoodInForm
          key={editing?._id ?? "new-goodin"}
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
