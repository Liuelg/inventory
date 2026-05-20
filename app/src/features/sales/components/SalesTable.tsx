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
import { useDeleteSale, useSales } from "../hooks"
import type { Sale } from "../types"

function getStoreName(store: Sale["store"]) {
  if (!store) return "-"
  if (typeof store === "string") return store
  return store.name || store._id || "-"
}

function getTotalItems(sale: Sale) {
  return sale.items.reduce((sum, item) => sum + item.quantity, 0)
}

interface SalesTableProps {
  onEdit: (sale: Sale) => void
}

export function SalesTable({ onEdit }: SalesTableProps) {
  const { data: sales, isLoading } = useSales()
  const remove = useDeleteSale()
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const columns: ColumnDef<Sale>[] = [
    {
      header: "Invoice",
      cell: (sale) => (
        <span className="font-medium">{sale.invoiceNumber || "-"}</span>
      ),
      className: "w-[120px]",
    },
    {
      header: "Customer",
      cell: (sale) => sale.customerName || "-",
    },
    {
      header: "Store",
      cell: (sale) => getStoreName(sale.store),
    },
    {
      header: "Items",
      cell: (sale) => getTotalItems(sale),
      className: "w-[60px] text-right",
    },
    {
      header: "Total",
      cell: (sale) => `${sale.totalAmount.toFixed(2)}`,
      className: "w-[100px] text-right whitespace-nowrap",
    },
    {
      header: "Date",
      cell: (sale) =>
        sale.date_time
          ? new Date(sale.date_time).toLocaleDateString()
          : "-",
      className: "w-[120px]",
    },
    {
      header: "Actions",
      className: "w-[120px] text-right",
      cell: (sale) => (
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={() => onEdit(sale)}>
            <Pencil />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive"
            onClick={() => setDeleteId(sale._id)}
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
        data={sales ?? []}
        columns={columns}
        keyExtractor={(sale) => sale._id}
        loading={isLoading}
        emptyMessage="No sales found."
      />

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action permanently deletes this sale record.
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
