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

const CURRENCY_SYMBOLS: Record<CurrencyCode, string> = {
  eur: "€",
  usd: "$",
  birr: "Br",
  visa: "Visa $",
}

type Props = {
  data: ReportByStoreItem[]
  currency: CurrencyCode
}

export function ReportByStoreTable({ data, currency }: Props) {
  const symbol = CURRENCY_SYMBOLS[currency]

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
            <TableHead>Store</TableHead>
            <TableHead className="text-right">Records</TableHead>
            <TableHead className="text-right">Quantity</TableHead>
            <TableHead className="text-right">Value</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((item) => (
            <TableRow key={item.store._id}>
              <TableCell className="font-medium">{item.store.name}</TableCell>
              <TableCell className="text-right">{item.records}</TableCell>
              <TableCell className="text-right">{item.quantity}</TableCell>
              <TableCell className="text-right">
                {symbol}{item.value.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
