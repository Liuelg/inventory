import { useMemo, useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { useStoreDaily } from "@/features/dashboard/hooks"
import { useCategories } from "@/features/categories/hooks"
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
import { ProductImageCell } from "@/components/ProductImageCell"
import { formatInventoryItemLabel, getPriceCurrency } from "@/features/products/utils"

function formatCurrency(amount: number) {
  return amount.toFixed(2)
}

type UnifiedRow = {
  key: string
  storeItemId: string
  productId: string
  image: string | null
  name: string
  category: string
  quantity: number
  price: number
}

function buildUnifiedRows(
  products: StoreRemainingProduct[]
): UnifiedRow[] {
  return products
    .filter((p) => p.product._id)
    .map((p) => ({
      key: p.storeItemId,
      storeItemId: p.storeItemId,
      productId: p.product._id,
      image: p.product.image || null,
      name: formatInventoryItemLabel(
        p.product.name,
        p.price,
        getPriceCurrency(p.product, p.price)
      ),
      category: typeof p.product.category === "string" ? p.product.category : "—",
      quantity: p.quantity,
      price: p.price,
    }))
    .sort((a, b) => a.name.localeCompare(b.name))
}

export function StoreDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data, isLoading } = useStoreDaily(id || "")
  const deleteItem = useDeleteStoreItem()
  const [deleteRow, setDeleteRow] = useState<UnifiedRow | null>(null)
  const { data: categories } = useCategories()

  const categoryMap = useMemo(() => {
    const map = new Map<string, string>()
    categories?.forEach((c) => map.set(c._id, c.name))
    return map
  }, [categories])

  const rows = data?.remainingProducts
    ? buildUnifiedRows(data.remainingProducts)
    : []

  async function handleDelete() {
    if (!id || !deleteRow) return
    await deleteItem.mutateAsync({ storeId: id, itemId: deleteRow.storeItemId })
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
      header: "Sales Person",
      cell: (s) => s.salesName || "—",
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
          <ProductImageCell
            image={r.image || undefined}
            altName={r.name || "Product image"}
          />
          <div className="flex flex-col min-w-0">
            <span className="font-medium truncate">{r.name}</span>
          </div>
        </div>
      ),
    },
    {
      header: "Category",
      cell: (r) => {
        if (!r.category) return "—"
        return categoryMap.get(r.category) || r.category
      },
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
          disabled={!r.storeItemId}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      ),
    },
  ]

  return (
    <div className="flex w-full flex-col gap-6">
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
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 shrink-0">
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

          {/* Tables scroll together below the summary cards */}
          <div className="flex flex-col gap-6">
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
                keyExtractor={(r) => r.key}
                emptyMessage="No products in stock."
              />
            </div>
          </div>
        </>
      ) : null}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteRow} onOpenChange={() => setDeleteRow(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove from store?</AlertDialogTitle>
            <AlertDialogDescription>
              {`This will remove "${deleteRow?.name}" from the store inventory.`}
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
