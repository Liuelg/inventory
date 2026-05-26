import { Link } from "react-router-dom"
import { BarChart3 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DataTable, type ColumnDef } from "@/components/Table"
import { useAuthSession } from "@/hooks/use-auth-session"
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
  const { data: session } = useAuthSession()
  const isAdmin = session?.role === "admin"

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  })

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex w-full flex-row items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-sm text-gray-500">{today}</p>
        </div>
        {isAdmin && (
          <Button asChild>
            <Link to="/reports">
              <BarChart3 className="mr-2 h-4 w-4" />
              Generate Report
            </Link>
          </Button>
        )}
      </div>
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
