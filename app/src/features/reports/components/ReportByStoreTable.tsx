import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { ReportByStoreItem } from "../types"
import type { CurrencyCode } from "@/features/currency/types"



type Props = {
  data: ReportByStoreItem[]
  currency: CurrencyCode
}

export function ReportByStoreTable({ data }: Props) {

  if (data.length === 0) {
    return (
      <div className="text-muted-foreground py-8 text-center text-sm">
        No store data found for the selected period.
      </div>
    )
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="sticky top-0 z-10 bg-background">Store</TableHead>
            <TableHead className="sticky top-0 z-10 bg-background text-right">Records</TableHead>
            <TableHead className="sticky top-0 z-10 bg-background text-right">Quantity</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((item) => (
            <TableRow key={item.store._id}>
              <TableCell className="font-medium">{item.store.name}</TableCell>
              <TableCell className="text-right">{item.records}</TableCell>
              <TableCell className="text-right">{item.quantity}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
