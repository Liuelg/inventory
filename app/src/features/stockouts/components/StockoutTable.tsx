import { useState } from "react"
import { DataTable, type ColumnDef } from "@/components/Table.tsx"
import { Button } from "@/components/ui/button.tsx"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog.tsx"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog.tsx"
import { useDeleteStockout, useStockouts } from "../hooks"
import type { Stockout, StockoutItemPopulated } from "../types"
import { Pencil, Trash2, Eye } from "lucide-react"

function getStoreName(store: Stockout["store"]) {
  if (!store) return "-"
  if (typeof store === "string") return store
  return store.name || store._id || "-"
}

function getTotalItems(stockout: Stockout) {
  return stockout.items.reduce((sum, item) => sum + item.quantity, 0)
}

function StatusBadge({ status }: { status: Stockout["status"] }) {
  const classes = {
    pending:
      "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    accepted:
      "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    rejected: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  }

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${classes[status]}`}
    >
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  )
}

function ItemRow({ item }: { item: StockoutItemPopulated }) {
  const name =
    typeof item.item_id === "string" ? item.item_id : item.item_id.name
  return (
    <div className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
      <span className="font-medium">{name}</span>
      <span className="text-muted-foreground">
        {item.quantity} × {item.price.toFixed(2)}
      </span>
    </div>
  )
}

interface StockoutTableProps {
  onEdit: (stockout: Stockout) => void
}

export function StockoutTable({ onEdit }: StockoutTableProps) {
  const { data: stockouts, isLoading } = useStockouts()
  const remove = useDeleteStockout()
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [viewing, setViewing] = useState<Stockout | null>(null)

  const columns: ColumnDef<Stockout>[] = [
    {
      header: "ID",
      cell: (s) => <span className="font-medium">{s._id.slice(-6)}</span>,
      className: "w-[80px]",
    },
    {
      header: "Store",
      cell: (s) => getStoreName(s.store),
    },
    {
      header: "Items",
      cell: (s) => (
        <Button
          variant="ghost"
          size="sm"
          className="h-auto px-2 py-0.5 text-xs font-medium"
          onClick={() => setViewing(s)}
        >
          {getTotalItems(s)} items
        </Button>
      ),
      className: "w-[80px] text-right",
    },
    {
      header: "Status",
      cell: (s) => <StatusBadge status={s.status} />,
      className: "w-[100px]",
    },
    {
      header: "Date",
      cell: (s) =>
        s.date ? new Date(s.date).toLocaleDateString() : "-",
      className: "w-[120px]",
    },
    {
      header: "Actions",
      className: "w-[120px] text-right",
      cell: (s) => (
        <div className="flex justify-end gap-2">
          <Button
            variant="ghost"
            size="sm"
            title="View Items"
            onClick={() => setViewing(s)}
          >
            <Eye />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => onEdit(s)}>
            <Pencil />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive"
            onClick={() => setDeleteId(s._id)}
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
        data={stockouts ?? []}
        columns={columns}
        keyExtractor={(s) => s._id}
        loading={isLoading}
        emptyMessage="No stockouts found."
      />

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action permanently deletes this stockout record.
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

      <Dialog open={!!viewing} onOpenChange={() => setViewing(null)}>
        <DialogContent className="max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Stockout Items</DialogTitle>
            <DialogDescription>
              Products included in this stockout request.
            </DialogDescription>
          </DialogHeader>

          {viewing ? (
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Store</p>
                  <p className="font-medium">{getStoreName(viewing.store)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Status</p>
                  <StatusBadge status={viewing.status} />
                </div>
                <div>
                  <p className="text-muted-foreground">Date</p>
                  <p className="font-medium">
                    {viewing.date
                      ? new Date(viewing.date).toLocaleDateString()
                      : "-"}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Total Items</p>
                  <p className="font-medium">{getTotalItems(viewing)}</p>
                </div>
              </div>

              {viewing.note ? (
                <div className="text-sm">
                  <p className="text-muted-foreground">Note</p>
                  <p className="font-medium">{viewing.note}</p>
                </div>
              ) : null}

              <div className="flex flex-col gap-2">
                <p className="text-sm font-medium">Items</p>
                {viewing.items.map((item, idx) => (
                  <ItemRow key={idx} item={item} />
                ))}
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  )
}
