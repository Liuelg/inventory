import { Link } from "react-router-dom"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DataTable, type ColumnDef } from "@/components/Table"
import { DailySalesChart } from "@/features/dashboard/components/DailySalesChart"
import { useDailySales } from "@/features/dashboard/hooks"
import type { DailySalesRow } from "@/features/dashboard/types"

function formatCurrency(amount: number) {
  if (amount === 0) return "0.00"
  return amount.toFixed(2)
}

const columns: ColumnDef<DailySalesRow>[] = [
  {
    header: "Store",
    cell: (row) => (
      <Link
        to={`/stores/${row.store._id}`}
        className="font-medium text-primary underline-offset-4 hover:underline"
      >
        {row.store.name}
      </Link>
    ),
  },
  {
    header: "Total Sales",
    cell: (row) => formatCurrency(row.totalSales),
    className: "text-right whitespace-nowrap",
  },
  {
    header: "Transactions",
    cell: (row) => row.transactions,
    className: "text-right",
  },
  {
    header: "Items Sold",
    cell: (row) => row.itemsSold,
    className: "text-right",
  },
  {
    header: "Products in Stock",
    cell: (row) => (
      <span
        className={
          row.productsInStock <= 10
            ? "text-destructive font-medium"
            : "text-foreground"
        }
      >
        {row.productsInStock}
      </span>
    ),
    className: "text-right",
  },
]

export function Home() {
  const { data: rows, isLoading } = useDailySales()
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  })

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex w-full flex-col sm:flex-row items-start justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-sm text-gray-500">{today}</p>
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Today's Sales by Store</CardTitle>
        </CardHeader>
        <CardContent className="px-2 sm:px-6">
          <DailySalesChart data={rows ?? []} />
        </CardContent>
      </Card>

      <DataTable
        data={rows ?? []}
        columns={columns}
        keyExtractor={(row) => row.store._id}
        loading={isLoading}
        emptyMessage="No store data available."
      />
    </div>
  )
}
