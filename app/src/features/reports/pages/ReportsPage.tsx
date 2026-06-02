import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { ReportFilters } from "../components/ReportFilters"
import { ReportSummaryCards } from "../components/ReportSummaryCards"
import { ReportBreakdownTable } from "../components/ReportBreakdownTable"
import { ReportByStoreTable } from "../components/ReportByStoreTable"
import { useReport } from "../hooks"
import { generateReportPDF } from "../utils"
import type { ReportParams } from "../types"
import { Printer } from "lucide-react"

export function ReportsPage() {
  const [params, setParams] = useState<ReportParams | null>(null)
  const { data, isLoading, isFetching } = useReport(params)
  const report = data?.data

  const handleGenerate = (newParams: ReportParams) => {
    setParams(newParams)
  }

  const loading = isLoading || isFetching

  return (
    <div className="flex h-full w-full flex-col gap-4">
      <div>
        <h1 className="text-2xl font-bold">Reports</h1>
        <p className="text-sm text-gray-500">
          Generate daily, weekly, and monthly reports for sales, stock ins, and
          stock outs.
        </p>
      </div>

      <ReportFilters onGenerate={handleGenerate} isLoading={loading} />

      {report && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-muted-foreground text-sm">
            Showing{" "}
            <span className="font-medium capitalize">{report.period}</span>{" "}
            report for{" "}
            <span className="font-medium capitalize">
              {report.type === "goodIns"
                ? "Stock In"
                : report.type === "stockouts"
                  ? "Stock Out"
                  : "Sales"}
            </span>{" "}
            ({new Date(report.start).toLocaleDateString()} –{" "}
            {new Date(report.end).toLocaleDateString()})
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => generateReportPDF(report)}
          >
            <Printer className="mr-2 h-4 w-4" />
            Export PDF
          </Button>
        </div>
      )}

      {loading && params ? (
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
          <Skeleton className="h-64 w-full" />
        </div>
      ) : report ? (
        <div className="flex flex-col gap-4">
          <ReportSummaryCards summary={report.summary} />

          <Tabs defaultValue="product">
            <TabsList>
              <TabsTrigger value="product">By Product</TabsTrigger>
              <TabsTrigger value="store">By Store</TabsTrigger>
            </TabsList>
            <TabsContent value="product" className="pt-2">
              <ReportBreakdownTable data={report.breakdown} />
            </TabsContent>
            <TabsContent value="store" className="pt-2">
              <ReportByStoreTable data={report.byStore} />
            </TabsContent>
          </Tabs>
        </div>
      ) : null}

      {!params && !loading && (
        <div className="text-muted-foreground flex flex-col items-center justify-center gap-2 py-16 text-sm">
          <p className="text-lg font-medium">No report generated yet</p>
          <p>Select filters and click "Generate Report" to see results.</p>
        </div>
      )}
    </div>
  )
}
