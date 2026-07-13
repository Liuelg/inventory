import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { ReportBreakdownItem } from "../types"
import type { CurrencyCode } from "@/features/currency/types"



type Props = {
  data: ReportBreakdownItem[]
  currency: CurrencyCode
}

export function ReportBreakdownTable({ data }: Props) {

  if (data.length === 0) {
    return (
      <div className="text-muted-foreground py-8 text-center text-sm">
        No product data found for the selected period.
      </div>
    )
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader className="sticky top-0 z-10 bg-background">
          <TableRow>
            <TableHead className="bg-background">Product</TableHead>
            <TableHead className="bg-background text-right">Quantity</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {[...data].sort((a, b) => a.product.name.localeCompare(b.product.name)).map((item) => (
            <TableRow key={item.product._id}>
              <TableCell className="font-medium">{item.product.name}</TableCell>
              <TableCell className="text-right">{item.quantity}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
