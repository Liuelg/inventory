import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { ReportSummary } from "../types"
import { FileText, Package, Banknote } from "lucide-react"

type Props = {
  summary: ReportSummary
}

function formatCurrency(value: number, symbol: string) {
  return `${symbol}${value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

export function ReportSummaryCards({ summary }: Props) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Total Records</CardTitle>
          <FileText className="text-muted-foreground h-4 w-4" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{summary.totalRecords}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Total Items</CardTitle>
          <Package className="text-muted-foreground h-4 w-4" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{summary.totalItems}</div>
        </CardContent>
      </Card>

      {summary.totalValueByCurrency ? (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Value</CardTitle>
            <Banknote className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-1">
              {summary.totalValueByCurrency.eur > 0 && (
                <div className="text-sm font-semibold">
                  {formatCurrency(summary.totalValueByCurrency.eur, "€")}
                </div>
              )}
              {summary.totalValueByCurrency.usd > 0 && (
                <div className="text-sm font-semibold">
                  {formatCurrency(summary.totalValueByCurrency.usd, "$")}
                </div>
              )}
              {summary.totalValueByCurrency.birr > 0 && (
                <div className="text-sm font-semibold">
                  {formatCurrency(summary.totalValueByCurrency.birr, "Br ")}
                </div>
              )}
              {summary.totalValueByCurrency.visa > 0 && (
                <div className="text-sm font-semibold">
                  {formatCurrency(summary.totalValueByCurrency.visa, "Visa $")}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Value</CardTitle>
            <Banknote className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(summary.totalValue, "$")}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
