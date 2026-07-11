import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { ReportFilters } from "../components/ReportFilters"
import { ReportSummaryCards } from "../components/ReportSummaryCards"
import { ReportBreakdownTable } from "../components/ReportBreakdownTable"
import { ReportTransactionsTable } from "../components/ReportTransactionsTable"
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
          Generate daily, weekly, and monthly reports for sales, stock ins,
          stock outs, and remaining products.
        </p>
      </div>

      <ReportFilters onGenerate={handleGenerate} isLoading={loading} />

      {report && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-muted-foreground text-sm">
            {report.type === "remaining" ? (
              <>
                Showing current inventory report for{" "}
                <span className="font-medium">Remaining Products</span> (as
                of {new Date(report.start).toLocaleDateString()})
              </>
            ) : (
              <>
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
              </>
            )}
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
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden">
          <ReportSummaryCards
            summary={report.summary}
            currency={report.currency}
          />

          <div className="min-h-0 flex-1 overflow-auto">
            {report.type === "remaining" ? (
              <ReportBreakdownTable
                data={report.breakdown}
                currency={report.currency}
              />
            ) : (
              <Tabs defaultValue="product" className="h-full">
                <TabsList>
                  <TabsTrigger value="product">By Product</TabsTrigger>
                  {report.type === "sales" && (
                    <TabsTrigger value="transaction">By Transaction</TabsTrigger>
                  )}
                </TabsList>
                <TabsContent value="product" className="pt-2 h-[calc(100%-40px)]">
                  <ReportBreakdownTable
                    data={report.breakdown}
                    currency={report.currency}
                  />
                </TabsContent>
                
                {report.type === "sales" && (
                  <TabsContent value="transaction" className="pt-2 h-[calc(100%-40px)]">
                    <ReportTransactionsTable
                      data={report.transactions}
                      currency={report.currency}
                    />
                  </TabsContent>
                )}
              </Tabs>
            )}
          </div>
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
