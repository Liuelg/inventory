import * as React from "react"
import { cn } from "@/lib/utils"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table.tsx"

export { Table, TableBody, TableCell, TableHead, TableHeader, TableRow }

/* ------------------------------------------------------------------ */
/*  Reusable DataTable                                                 */
/* ------------------------------------------------------------------ */

export interface ColumnDef<T> {
  header: React.ReactNode
  cell: (row: T, index: number) => React.ReactNode
  className?: string
}

export interface DataTableProps<T> {
  data: T[]
  columns: ColumnDef<T>[]
  keyExtractor: (row: T) => string | number
  emptyMessage?: React.ReactNode
  loading?: boolean
  containerClassName?: string
  tableClassName?: string
  onRowClick?: (row: T) => void
}

export function DataTable<T>({
  data,
  columns,
  keyExtractor,
  emptyMessage = "No data found.",
  loading = false,
  containerClassName,
  tableClassName,
  onRowClick,
}: DataTableProps<T>) {
  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="border-primary h-8 w-8 animate-spin rounded-full border-4 border-t-transparent" />
      </div>
    )
  }

  return (
    <Table
      containerClassName={cn(
        "min-h-0 flex-1 overflow-auto rounded-lg border border-border bg-background",
        containerClassName
      )}
      className={cn("relative", tableClassName)}
    >
      <TableHeader className="sticky top-0 z-10 bg-background shadow-[0_1px_0_0_var(--border)]">
        <TableRow>
          {columns.map((col, i) => (
            <TableHead key={i} className={col.className}>
              {col.header}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.length === 0 ? (
          <TableRow>
            <TableCell
              colSpan={columns.length}
              className="text-center text-muted-foreground"
            >
              {emptyMessage}
            </TableCell>
          </TableRow>
        ) : (
          data.map((row, rowIndex) => (
            <TableRow
              key={keyExtractor(row)}
              onClick={() => onRowClick?.(row)}
              className={cn(
                onRowClick && "cursor-pointer hover:bg-muted/50"
              )}
            >
              {columns.map((col, colIndex) => (
                <TableCell key={colIndex} className={col.className}>
                  {col.cell(row, rowIndex)}
                </TableCell>
              ))}
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  )
}

/* ------------------------------------------------------------------ */
/*  Demo                                                               */
/* ------------------------------------------------------------------ */

interface Invoice {
  invoice: string
  paymentStatus: string
  totalAmount: string
  paymentMethod: string
}

const invoices: Invoice[] = [
  { invoice: "INV001", paymentStatus: "Paid", totalAmount: "$250.00", paymentMethod: "Credit Card" },
  { invoice: "INV002", paymentStatus: "Pending", totalAmount: "$150.00", paymentMethod: "PayPal" },
  { invoice: "INV003", paymentStatus: "Unpaid", totalAmount: "$350.00", paymentMethod: "Bank Transfer" },
  { invoice: "INV004", paymentStatus: "Paid", totalAmount: "$450.00", paymentMethod: "Credit Card" },
  { invoice: "INV005", paymentStatus: "Paid", totalAmount: "$550.00", paymentMethod: "PayPal" },
  { invoice: "INV006", paymentStatus: "Pending", totalAmount: "$200.00", paymentMethod: "Bank Transfer" },
  { invoice: "INV007", paymentStatus: "Unpaid", totalAmount: "$300.00", paymentMethod: "Credit Card" },
]

const invoiceColumns: ColumnDef<Invoice>[] = [
  { header: "Invoice", cell: (r) => r.invoice, className: "w-[100px]" },
  { header: "Status", cell: (r) => r.paymentStatus },
  { header: "Method", cell: (r) => r.paymentMethod },
  { header: "Amount", cell: (r) => r.totalAmount, className: "text-right" },
]

export function TableDemo() {
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <DataTable
        data={invoices}
        columns={invoiceColumns}
        keyExtractor={(r) => r.invoice}
      />
    </div>
  )
}
