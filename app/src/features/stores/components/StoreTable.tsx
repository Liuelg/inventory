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
import { useDeleteStore, useStores } from "../hooks"
import { StoreForm } from "./StoreForm"
import type { Store } from "../types"

function getManagerLabel(store: Store) {
  const manager = store.manager_id
  if (!manager) return "-"
  if (typeof manager === "string") return manager
  if (manager.name && manager.email) return `${manager.name} (${manager.email})`
  return manager.name || manager.email || manager._id || "-"
}

export function StoreTable() {
  const { data: stores, isLoading } = useStores()
  const remove = useDeleteStore()

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Store | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  function openAdd() {
    setEditing(null)
    setFormOpen(true)
  }

  function openEdit(store: Store) {
    setEditing(store)
    setFormOpen(true)
  }

  function handleFormSuccess() {
    setFormOpen(false)
    setEditing(null)
  }

  const columns: ColumnDef<Store>[] = [
    {
      header: "Name",
      cell: (store) => <span className="font-medium">{store.name || "-"}</span>,
    },
    {
      header: "Address",
      cell: (store) => store.address || "-",
    },
    {
      header: "Manager",
      cell: (store) => getManagerLabel(store),
    },
    {
      header: "Actions",
      className: "w-[120px] text-right",
      cell: (store) => (
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={() => openEdit(store)}>
            <Pencil />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive"
            onClick={() => setDeleteId(store._id)}
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
          Add Store
        </Button>
      </div>

      <DataTable
        data={stores ?? []}
        columns={columns}
        keyExtractor={(store) => store._id}
        loading={isLoading}
        emptyMessage="No stores found."
      />

      {formOpen ? (
        <StoreForm
          key={editing?._id ?? "new-store"}
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
              This action permanently deletes this store.
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
