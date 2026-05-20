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
import { useDeleteGoodIn, useGoodIns } from "../hooks"
import type { GoodIn } from "../types"

function getStoreName(store: GoodIn["store"]) {
  if (!store) return "-"
  if (typeof store === "string") return store
  return store.name || store._id || "-"
}

function getTotalItems(goodIn: GoodIn) {
  return goodIn.items.reduce((sum, item) => sum + item.quantity, 0)
}

interface GoodInTableProps {
  onEdit: (goodIn: GoodIn) => void
}

export function GoodInTable({ onEdit }: GoodInTableProps) {
  const { data: goodIns, isLoading } = useGoodIns()
  const remove = useDeleteGoodIn()
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const columns: ColumnDef<GoodIn>[] = [
    {
      header: "ID",
      cell: (g) => <span className="font-medium">{g._id.slice(-6)}</span>,
      className: "w-[80px]",
    },
    {
      header: "Store",
      cell: (g) => getStoreName(g.store),
    },
    {
      header: "Items",
      cell: (g) => getTotalItems(g),
      className: "w-[60px] text-right",
    },
    {
      header: "Accepted",
      cell: (g) => (g.is_accepted ? "Yes" : "No"),
      className: "w-[80px]",
    },
    {
      header: "Date",
      cell: (g) =>
        g.date ? new Date(g.date).toLocaleDateString() : "-",
      className: "w-[120px]",
    },
    {
      header: "Actions",
      className: "w-[120px] text-right",
      cell: (g) => (
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={() => onEdit(g)}>
            <Pencil />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive"
            onClick={() => setDeleteId(g._id)}
          >
            <Trash2 />
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-4">
      <DataTable
        data={goodIns ?? []}
        columns={columns}
        keyExtractor={(g) => g._id}
        loading={isLoading}
        emptyMessage="No stock entries found."
      />

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action permanently deletes this stock entry.
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
