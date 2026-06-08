import { useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { useStoreDaily } from "@/features/dashboard/hooks"
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
import { ArrowLeftIcon, Trash2 } from "lucide-react"
import { useDeleteStoreItem } from "@/features/stores/hooks"
import type { StoreSale, StoreRemainingProduct } from "@/features/dashboard/types"
import { getProductImageUrl } from "@/features/products/utils"

function formatCurrency(amount: number) {
  return amount.toFixed(2)
}

type UnifiedRow =
  | {
      _id: string
      type: "group"
      image: string | null
      name: string
      category: string
      quantity: number
      price: number
      items: StoreRemainingProduct[]
    }
  | {
      _id: string
      type: "individual"
      image: string | null
      name: string
      category: string
      quantity: number
      price: number
    }

function buildUnifiedRows(
  products: StoreRemainingProduct[]
): UnifiedRow[] {
  const groupMap = new Map<
    string,
    { group: NonNullable<StoreRemainingProduct["group"]>; items: StoreRemainingProduct[] }
  >()
  const rows: UnifiedRow[] = []

  for (const p of products) {
    // Skip items with missing product reference
    if (!p.product._id) continue

    if (p.group?._id) {
      const existing = groupMap.get(p.group._id)
      if (existing) {
        existing.items.push(p)
      } else {
        groupMap.set(p.group._id, { group: p.group, items: [p] })
      }
    } else {
      rows.push({
        _id: p.product._id,
        type: "individual",
        image: p.product.image || null,
        name: p.product.name,
        category: typeof p.product.category === "string" ? p.product.category : "—",
        quantity: p.quantity,
        price: p.price,
      })
    }
  }

  for (const { group, items } of groupMap.values()) {
    const totalQty = items.reduce((sum, i) => sum + i.quantity, 0)
    const avgPrice =
      items.reduce((sum, i) => sum + i.price * i.quantity, 0) / totalQty || 0
    rows.push({
      _id: group._id,
      type: "group",
      image: group.image || null,
      name: group.name,
      category: "",
      quantity: totalQty,
      price: avgPrice,
      items,
    })
  }

  return rows
}

export function StoreDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data, isLoading } = useStoreDaily(id || "")
  const deleteItem = useDeleteStoreItem()
  const [deleteRow, setDeleteRow] = useState<UnifiedRow | null>(null)

  const rows = data?.remainingProducts
    ? buildUnifiedRows(data.remainingProducts)
    : []

  async function handleDelete() {
    if (!id || !deleteRow) return

    if (deleteRow.type === "individual") {
      await deleteItem.mutateAsync({ storeId: id, itemId: deleteRow._id })
    } else {
      // Delete all products in the group
      await Promise.all(
        deleteRow.items.map((item) =>
          deleteItem.mutateAsync({
            storeId: id,
            itemId: item.product._id,
          })
        )
      )
    }
    setDeleteRow(null)
  }

  const saleColumns: ColumnDef<StoreSale>[] = [
    {
      header: "Invoice",
      cell: (s) => <span className="font-medium">{s.invoiceNumber}</span>,
      className: "w-[120px]",
    },
    {
      header: "Customer",
      cell: (s) => s.customerName || "—",
    },
    {
      header: "Items",
      cell: (s) => s.items.map((i) => `${i.name} (${i.quantity})`).join(", "),
    },
    {
      header: "Total",
      cell: (s) => formatCurrency(s.totalAmount),
      className: "w-[100px] text-right whitespace-nowrap",
    },
    {
      header: "Processed By",
      cell: (s) => s.processedBy,
    },
    {
      header: "Time",
      cell: (s) =>
        s.date_time ? new Date(s.date_time).toLocaleTimeString() : "—",
      className: "w-[100px]",
    },
  ]

  const remainingColumns: ColumnDef<UnifiedRow>[] = [
    {
      header: "Product",
      cell: (r) => (
        <div className="flex items-center gap-3">
          {r.image ? (
            <img
<<<<<<< HEAD
              src={r.image}
              alt={r.name}
=======
              src={getProductImageUrl(r.product.image)}
              alt={r.product.name}
>>>>>>> new
              className="h-10 w-10 rounded-md object-cover border"
            />
          ) : (
            <div className="h-10 w-10 rounded-md border bg-muted flex items-center justify-center text-xs text-muted-foreground">
              No img
            </div>
          )}
          <div className="flex flex-col min-w-0">
            <span className="font-medium truncate">{r.name}</span>
            {r.type === "group" && r.items.length > 0 && (
              <span className="text-xs text-muted-foreground truncate">
                {r.items.map((i) => `${i.product.name} (${i.quantity})`).join(", ")}
              </span>
            )}
          </div>
        </div>
      ),
    },
    {
      header: "Category",
      cell: (r) => r.category || "—",
    },
    {
      header: "Quantity",
      cell: (r) => r.quantity,
      className: "w-[90px] text-right",
    },
    {
      header: "Price",
      cell: (r) => formatCurrency(r.price),
      className: "w-[100px] text-right whitespace-nowrap",
    },
    {
      header: "",
      className: "w-[50px]",
      cell: (r) => (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-destructive"
          onClick={() => setDeleteRow(r)}
          disabled={!r._id}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      ),
    },
  ]

  return (
    <div className="flex h-full w-full flex-col gap-6">
      <div className="flex flex-col gap-4">
        <Button
          variant="ghost"
          size="sm"
          className="w-fit"
          onClick={() => navigate("/")}
        >
          <ArrowLeftIcon className="mr-1 size-4" />
          Back to Dashboard
        </Button>

        <div>
          <h1 className="text-2xl font-bold">
            {data?.store.name || "Store Detail"}
          </h1>
          <p className="text-sm text-gray-500">
            {data?.store.address || "Loading..."}
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="border-primary h-8 w-8 animate-spin rounded-full border-4 border-t-transparent" />
        </div>
      ) : data ? (
        <>
          {/* Today's Summary Cards */}
          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">Total Sales Today</p>
              <p className="text-xl font-bold">
                {formatCurrency(data.todaySales.totalSales)}
              </p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">Transactions</p>
              <p className="text-xl font-bold">
                {data.todaySales.transactions}
              </p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">Items Sold Today</p>
              <p className="text-xl font-bold">{data.todaySales.itemsSold}</p>
            </div>
          </div>

          {/* Today's Sales Table */}
          <div className="flex flex-col gap-2">
            <h2 className="text-lg font-semibold">Today&apos;s Sales</h2>
            <DataTable
              data={data.sales}
              columns={saleColumns}
              keyExtractor={(s) => s._id}
              emptyMessage="No sales recorded today."
            />
          </div>

          {/* Remaining Products — Unified Table */}
          <div className="flex flex-col gap-2">
            <h2 className="text-lg font-semibold">Remaining Products</h2>
            <DataTable
              data={rows}
              columns={remainingColumns}
              keyExtractor={(r) => r._id}
              emptyMessage="No products in stock."
            />
          </div>
        </>
      ) : null}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteRow} onOpenChange={() => setDeleteRow(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove from store?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteRow?.type === "group"
                ? `This will remove all ${deleteRow.items.length} products in "${deleteRow.name}" from the store inventory.`
                : `This will remove "${deleteRow?.name}" from the store inventory.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteRow(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDelete}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
