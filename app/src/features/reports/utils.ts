import * as XLSX from "xlsx"
import type { ReportData, ReportType } from "./types"
import { getCurrencySymbol } from "@/features/sales/components/CurrencySelector"
import type { CurrencyCode } from "@/features/currency/types"

function getReportTypeLabel(type: ReportType): string {
  switch (type) {
    case "goodIns":
      return "Stock In"
    case "stockouts":
      return "Stock Out"
    case "sales":
      return "Sales"
    case "remaining":
      return "Remaining Products"
  }
}

export function generateReportExcel(report: ReportData) {
  const wb = XLSX.utils.book_new()
  const sym = getCurrencySymbol(report.currency as CurrencyCode)
  const typeLabel = getReportTypeLabel(report.type)
  const dateRange =
    report.type === "remaining"
      ? new Date(report.start).toLocaleDateString()
      : `${new Date(report.start).toLocaleDateString()} – ${new Date(report.end).toLocaleDateString()}`

  // --- Summary Sheet ---
  const summaryRows = [
    ["Inventory Report"],
    [],
    ["Type", typeLabel],
    ["Date Range", dateRange],
    ["Store", report.storeFilter || "All Stores"],
    [],
    ["Metric", "Value"],
    ["Total Records", report.summary.totalRecords],
    ["Total Items", report.summary.totalItems],
    [
      "Total Value",
      `${sym}${report.summary.totalValue.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`,
    ],
  ]
  const summaryWs = XLSX.utils.aoa_to_sheet(summaryRows)
  XLSX.utils.book_append_sheet(wb, summaryWs, "Summary")

  // --- By Product Sheet ---
  if (report.breakdown.length > 0) {
    const productData = report.breakdown.map((item) => ({
      Product: item.product.name,
      Quantity: item.quantity,
      Value: item.value,
    }))
    const productWs = XLSX.utils.json_to_sheet(productData)
    // Add currency header note
    XLSX.utils.sheet_add_aoa(
      productWs,
      [[`Values shown in ${report.currency.toUpperCase()} (${sym})`]],
      { origin: -1 }
    )
    XLSX.utils.book_append_sheet(wb, productWs, "By Product")
  }

  // --- By Store Sheet ---
  if (report.byStore.length > 0) {
    const storeData = report.byStore.map((item) => ({
      Store: item.store.name,
      Records: item.records,
      Quantity: item.quantity,
      Value: item.value,
    }))
    const storeWs = XLSX.utils.json_to_sheet(storeData)
    XLSX.utils.sheet_add_aoa(
      storeWs,
      [[`Values shown in ${report.currency.toUpperCase()} (${sym})`]],
      { origin: -1 }
    )
    XLSX.utils.book_append_sheet(wb, storeWs, "By Store")
  }

  // --- Transactions Sheet (sales only) ---
  if (report.transactions && report.transactions.length > 0) {
    const txRows: Record<string, string | number>[] = []
    for (const t of report.transactions) {
      for (const item of t.items) {
        txRows.push({
          "Invoice #": t.invoiceNumber,
          Date: t.date ? new Date(t.date).toLocaleString() : "—",
          Store: t.storeName,
          "Sales Person": t.salesName || "—",
          Customer: t.customerName || "—",
          Product: item.product.name,
          Quantity: item.quantity,
          Value: item.value,
        })
      }
    }
    const txWs = XLSX.utils.json_to_sheet(txRows)
    XLSX.utils.sheet_add_aoa(
      txWs,
      [[`Values shown in ${report.currency.toUpperCase()} (${sym})`]],
      { origin: -1 }
    )
    XLSX.utils.book_append_sheet(wb, txWs, "Transactions")
  }

  const fileName = `${report.type}_${report.start}_${report.end}.xlsx`
  XLSX.writeFile(wb, fileName)
}
