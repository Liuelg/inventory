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
import { useDeleteStock, useStocks } from "../hooks"
import type { Stock } from "../types"
import { ProductImageCell } from "@/components/ProductImageCell"
import { getProductImageUrl } from "@/features/products/utils"

interface StockTableProps {
  onEdit: (stock: Stock) => void
}

function getProductName(item: Stock["items"][number]) {
  if (typeof item.item_id === "string") return item.item_id
  return item.item_id?.name ?? "—"
}

function getProductCategory(item: Stock["items"][number]) {
  if (typeof item.item_id === "string") return "—"
  const cat = item.item_id?.category
  if (!cat) return "—"
  if (typeof cat === "string") return cat
  return cat.name ?? "—"
}

function formatItems(items: Stock["items"]) {
  if (items.length === 0) return "—"
  if (items.length === 1) {
    const name = getProductName(items[0])
    return name
  }
  return `${items.length} products`
}

function formatRemaining(items: Stock["items"]) {
  return items.reduce((sum, i) => sum + (i.remaining ?? 0), 0)
}

function getStockImage(stock: Stock) {
  const firstItem = stock.items?.[0]?.item_id
  if (firstItem && typeof firstItem !== "string") {
    return getProductImageUrl(firstItem.image)
  }
  return undefined
}


export function StockTable({ onEdit }: StockTableProps) {
  const { data: stocks, isLoading } = useStocks()
  
  const remove = useDeleteStock()
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const columns: ColumnDef<Stock>[] = [
    {
      header: "Date",
      cell: (s) =>
        s.date ? new Date(s.date).toLocaleDateString() : "—",
      className: "w-[120px]",
    },
    {
      header: "Image",
      className: "w-[72px]",
      cell: (s) => (
        <ProductImageCell 
          image={getStockImage(s)} 
          altName={s.items.length === 1 ? getProductName(s.items[0]) : "Stock Entry"} 
        />
      ),
    },
    {
      header: "Products",
      cell: (s) => formatItems(s.items),
    },
    
    {
      header: "Category",
      cell: (s) => {
        const cats = [
          ...new Set(s.items.map((i) => getProductCategory(i))),
        ]
        return cats.length === 1 ? cats[0] : cats.join(", ") || "—"
      },
    },
    {
      header: "Remaining",
      cell: (s) => formatRemaining(s.items),
      className: "w-[90px] text-right",
    },
    
    {
      header: "Actions",
      className: "w-[120px] text-right",
      cell: (s) => (
        <div className="flex justify-end gap-2">
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
    <div className="flex flex-col gap-4">
      <DataTable
        data={stocks ?? []}
        columns={columns}
        keyExtractor={(s) => s._id}
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
