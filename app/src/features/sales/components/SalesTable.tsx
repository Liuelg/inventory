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
import { ProductImageCell } from "@/components/ProductImageCell"
import type { Sale, SaleItem } from "../types"

function getStoreName(store: Sale["store"]) {
  if (!store) return "-"
  if (typeof store === "string") return store
  return store.name || store._id || "-"
}

function getTotalItems(sale: Sale) {
  return sale.items.reduce((sum, item) => sum + item.quantity, 0)
}

function getProductImages(items: SaleItem[]) {
  return items
    .map((item) => {
      if (item.image) return item.image
      if (typeof item.item_id === "object" && item.item_id !== null)
        return item.item_id.image
      return undefined
    })
    .filter(Boolean) as string[]
}

function getSaleCurrencies(sale: Sale): { label: string; total: number }[] {
  const sums = { eur: 0, usd: 0, birr: 0, visa: 0 }
  for (const item of sale.items) {
    sums.eur += (item.eur || 0) * item.quantity
    sums.usd += (item.usd || 0) * item.quantity
    sums.birr += (item.birr || 0) * item.quantity
    sums.visa += (item.visa || 0) * item.quantity
  }
  const map = [
    { label: "EUR", total: sums.eur },
    { label: "USD", total: sums.usd },
    { label: "BIRR", total: sums.birr },
    { label: "VISA", total: sums.visa },
  ]
  return map.filter((c) => c.total > 0)
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
      header: "Products",
      cell: (sale) => {
        const images = getProductImages(sale.items)
        const extra = images.length - 3
        return (
          <div className="flex items-center gap-1">
            {images.slice(0, 3).map((img, i) => (
              <ProductImageCell
                key={i}
                image={img}
                altName="Product image"
              />
            ))}
            {extra > 0 ? (
              <span className="h-8 w-8 rounded-md border bg-muted flex items-center justify-center text-xs text-muted-foreground">
                +{extra}
              </span>
            ) : null}
            {images.length === 0 ? (
              <span className="text-xs text-muted-foreground">—</span>
            ) : null}
          </div>
        )
      },
      className: "w-[140px]",
    },
    {
      header: "Customer",
      cell: (sale) => sale.customerName || "-",
    },
    {
      header: "Sales Person",
      cell: (sale) => sale.salesName || "-",
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
      cell: (sale) => {
        const currencies = getSaleCurrencies(sale)
        return (
          <div className="text-right">
            <div className="font-medium">
              {sale.totalAmount.toFixed(2)}
            </div>
            {currencies.length > 0 && (
              <div className="flex justify-end gap-1 mt-0.5">
                {currencies.map((c) => (
                  <span
                    key={c.label}
                    className="inline-flex items-center rounded-sm bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground"
                  >
                    {c.label} {c.total.toFixed(0)}
                  </span>
                ))}
              </div>
            )}
          </div>
        )
      },
      className: "w-[120px] text-right whitespace-nowrap",
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
