import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { ReportSummary } from "../types"
import type { CurrencyCode } from "@/features/currency/types"
import { FileText, Package } from "lucide-react"



type Props = {
  summary: ReportSummary
  currency: CurrencyCode
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

     
    </div>
  )
}
