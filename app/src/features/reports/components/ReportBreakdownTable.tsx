import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { ReportBreakdownItem } from "../types"

type Props = {
  data: ReportBreakdownItem[]
}

function formatCurrency(value: number, symbol: string) {
  return `${symbol}${value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

function CurrencyBreakdown({
  valueByCurrency,
}: {
  valueByCurrency?: ReportBreakdownItem["valueByCurrency"]
}) {
  if (!valueByCurrency) {
    return (
      <span>
        {formatCurrency(0, "$")}
      </span>
    )
  }

  return (
    <div className="flex flex-col items-end gap-0.5">
      {valueByCurrency.eur > 0 && (
        <span className="text-xs">{formatCurrency(valueByCurrency.eur, "€")}</span>
      )}
      {valueByCurrency.usd > 0 && (
        <span className="text-xs">{formatCurrency(valueByCurrency.usd, "$")}</span>
      )}
      {valueByCurrency.birr > 0 && (
        <span className="text-xs">{formatCurrency(valueByCurrency.birr, "Br ")}</span>
      )}
      {valueByCurrency.visa > 0 && (
        <span className="text-xs">{formatCurrency(valueByCurrency.visa, "Visa $")}</span>
      )}
    </div>
  )
}

export function ReportBreakdownTable({ data }: Props) {
  const hasCurrencyBreakdown = data.some((item) => item.valueByCurrency)

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
        <TableHeader>
          <TableRow>
            <TableHead>Product</TableHead>
            <TableHead className="text-right">Quantity</TableHead>
            <TableHead className="text-right">
              {hasCurrencyBreakdown ? "Value by Currency" : "Value"}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((item) => (
            <TableRow key={item.product._id}>
              <TableCell className="font-medium">{item.product.name}</TableCell>
              <TableCell className="text-right">{item.quantity}</TableCell>
              <TableCell className="text-right">
                {hasCurrencyBreakdown ? (
                  <CurrencyBreakdown valueByCurrency={item.valueByCurrency} />
                ) : (
                  formatCurrency(item.value, "$")
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
