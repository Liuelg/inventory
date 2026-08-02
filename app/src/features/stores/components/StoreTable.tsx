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
import { Pencil, Trash2 } from "lucide-react"
import { useDeleteStore, useStores } from "../hooks"
import type { Store } from "../types"
import { Link } from "react-router-dom"

function getManagerLabel(store: Store) {
  // Prefer sales person (store staff) over manager_id
  const sp = store.salesPerson
  if (sp?.name) return sp.name

  const manager = store.manager_id
  if (!manager) return "-"
  if (typeof manager === "string") return manager
  if (manager.name && manager.email)
    return `${manager.name} (${manager.email})`
  return manager.name || manager.email || manager._id || "-"
}

interface StoreTableProps {
  onEdit: (store: Store) => void
}

export function StoreTable({ onEdit }: StoreTableProps) {
  const { data: stores, isLoading } = useStores()
  const remove = useDeleteStore()
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const columns: ColumnDef<Store>[] = [
    {
      header: "Code",
      cell: (store) => (
        <span className="font-mono font-medium">{store.code || "-"}</span>
      ),
      className: "w-[80px]",
    },
    {
      header: "Name",
      cell: (store) => (
        <Link
        to={`/stores/${store._id}`}
        className="font-medium text-primary underline-offset-4 hover:underline"
      >
        {store.name}
      </Link>
      ),
    },
    {
      header: "Address",
      cell: (store) => store.address || "-",
    },
    {
      header: "PEDS",
      cell: (store) =>
        store.pedsEnabled ? (
          <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
            ON
          </span>
        ) : (
          <span className="text-muted-foreground text-xs">-</span>
        ),
      className: "w-[60px]",
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
          <Button variant="ghost" size="sm" onClick={() => onEdit(store)}>
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
    <div className="flex flex-col gap-4">
      <DataTable
        data={stores ?? []}
        columns={columns}
        keyExtractor={(store) => store._id}
        loading={isLoading}
        emptyMessage="No stores found."
      />

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
