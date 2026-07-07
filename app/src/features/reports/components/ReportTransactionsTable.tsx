import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { ReportTransaction } from "../types"
import type { CurrencyCode } from "@/features/currency/types"


type Props = {
  data: ReportTransaction[]
  currency: CurrencyCode
}

export function ReportTransactionsTable({ data }: Props) {

  if (data.length === 0) {
    return (
      <div className="text-muted-foreground py-8 text-center text-sm">
        No transactions found for the selected period.
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {data.map((transaction) => (
        <div key={transaction._id} className="rounded-md border">
          <div className="flex items-center justify-between bg-muted/50 px-4 py-2 text-sm">
            <div className="flex items-center gap-3">
              <span className="font-semibold">
                {transaction.invoiceNumber}
              </span>
              <span className="text-muted-foreground">
                {transaction.customerName || "—"}
              </span>
            </div>
            <div className="flex items-center gap-3 text-muted-foreground">
              <span>{transaction.storeName}</span>
              <span>
                {transaction.date
                  ? new Date(transaction.date).toLocaleDateString()
                  : "—"}
              </span>
            </div>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Payment</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transaction.items.map((item, idx) => {
                const priceParts: string[] = []
                if (item.eur) priceParts.push(`€${item.eur}`)
                if (item.usd) priceParts.push(`$${item.usd}`)
                if (item.birr) priceParts.push(`Br${item.birr}`)
                if (item.visa) priceParts.push(`Visa $${item.visa}`)

                return (
                  <TableRow key={idx}>
                    <TableCell className="font-medium text-sm">
                      {item.product.name}
                    </TableCell>
                    <TableCell className="text-right">
                      {item.quantity}
                    </TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground">
                      {priceParts.join(" | ") || "—"}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      ))}
    </div>
  )
}
