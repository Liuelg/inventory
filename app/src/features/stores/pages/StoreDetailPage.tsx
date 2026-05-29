import { useParams, useNavigate } from "react-router-dom"
import { useStoreDaily } from "@/features/dashboard/hooks"
import { DataTable, type ColumnDef } from "@/components/Table.tsx"
import { Button } from "@/components/ui/button.tsx"
import { ArrowLeftIcon } from "lucide-react"
import type { StoreSale, StoreRemainingProduct } from "@/features/dashboard/types"

function formatCurrency(amount: number) {
  return amount.toFixed(2)
}

export function StoreDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data, isLoading } = useStoreDaily(id || "")

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

  const remainingColumns: ColumnDef<StoreRemainingProduct>[] = [
    {
      header: "Product",
      cell: (r) => (
        <div className="flex items-center gap-3">
          {r.product.image ? (
            <img
              src={r.product.image}
              alt={r.product.name}
              className="h-10 w-10 rounded-md object-cover border"
            />
          ) : (
            <div className="h-10 w-10 rounded-md border bg-muted flex items-center justify-center text-xs text-muted-foreground">
              No img
            </div>
          )}
          <span className="font-medium">{r.product.name}</span>
        </div>
      ),
    },
    {
      header: "Category",
      cell: (r) => r.product.category || "—",
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
            <h2 className="text-lg font-semibold">Today's Sales</h2>
            <DataTable
              data={data.sales}
              columns={saleColumns}
              keyExtractor={(s) => s._id}
              emptyMessage="No sales recorded today."
            />
          </div>

          {/* Remaining Products Table */}
          <div className="flex flex-col gap-2">
            <h2 className="text-lg font-semibold">Remaining Products</h2>
            <DataTable
              data={data.remainingProducts}
              columns={remainingColumns}
              keyExtractor={(r) => r.product._id}
              emptyMessage="No products in stock."
            />
          </div>
        </>
      ) : null}
    </div>
  )
}
