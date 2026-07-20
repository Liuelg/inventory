import * as XLSX from "xlsx"
import type { ReportData, ReportType } from "./types"
import { getCurrencySymbol } from "@/features/sales/components/CurrencySelector"
import type { CurrencyCode } from "@/features/currency/types"

function autoFitColumns(ws: XLSX.WorkSheet) {
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1 }) as unknown[][]
  if (!rows.length) return

  const colWidths = rows[0].map((_, colIndex) => {
    return rows.reduce((maxWidth, row) => {
      const cell = row[colIndex]
      const str = cell !== undefined && cell !== null ? String(cell) : ""
      return Math.max(maxWidth, str.length)
    }, 0)
  })

  ws["!cols"] = colWidths.map((w) => ({ wch: Math.min(w + 2, 60) }))
}

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

  // ============================================================
  // SHEET 1: Detailed Records (opens first so user sees it immediately)
  // ============================================================

  // For sales: use transactions (already has every sale exploded by item)
  // For goodIns/stockouts: use records if available
  // For remaining: use breakdown (individual products)
  const hasTransactions = report.transactions && report.transactions.length > 0
  const hasRecords = report.records && report.records.length > 0
  const hasBreakdown = report.breakdown && report.breakdown.length > 0

  if (hasTransactions) {
    // ---------------------------------------------------------
    // SHEET 1a: All Sales — one row per item (exploded detail)
    // ---------------------------------------------------------
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
          EUR: item.eur ?? 0,
          USD: item.usd ?? 0,
          BIRR: item.birr ?? 0,
          VISA: item.visa ?? 0,
        })
      }
    }
    const txWs = XLSX.utils.json_to_sheet(txRows)
    XLSX.utils.sheet_add_aoa(
      txWs,
      [[`Values shown in ${report.currency.toUpperCase()} (${sym})`]],
      { origin: -1 }
    )
    autoFitColumns(txWs)
    XLSX.utils.book_append_sheet(wb, txWs, "All Sales")

    // ---------------------------------------------------------
    // SHEET 1b: By Transaction — one row per sale/invoice
    // ---------------------------------------------------------
    const transactionRows: Record<string, string | number>[] = []
    for (const t of report.transactions) {
      const totalItems = t.items.reduce((sum, item) => sum + (item.quantity || 0), 0)
      transactionRows.push({
        "Invoice #": t.invoiceNumber,
        Date: t.date ? new Date(t.date).toLocaleString() : "—",
        Store: t.storeName,
        "Sales Person": t.salesName || "—",
        Customer: t.customerName || "—",
        "Total Items": totalItems,
        "Total Amount": t.totalAmount,
      })
    }
    const transactionWs = XLSX.utils.json_to_sheet(transactionRows)
    XLSX.utils.sheet_add_aoa(
      transactionWs,
      [[`Values shown in ${report.currency.toUpperCase()} (${sym})`]],
      { origin: -1 }
    )
    autoFitColumns(transactionWs)
    XLSX.utils.book_append_sheet(wb, transactionWs, "By Transaction")

    // ---------------------------------------------------------
    // SHEET 1c: By Sales Person — what each person sold
    // ---------------------------------------------------------
    const salesPersonMap = new Map<string, Map<string, { quantity: number; value: number }>>()
    for (const t of report.transactions) {
      const person = t.salesName || "—"
      if (!salesPersonMap.has(person)) {
        salesPersonMap.set(person, new Map())
      }
      const productMap = salesPersonMap.get(person)!
      for (const item of t.items) {
        const existing = productMap.get(item.product.name) || { quantity: 0, value: 0 }
        existing.quantity += item.quantity || 0
        existing.value += item.value || 0
        productMap.set(item.product.name, existing)
      }
    }

    const salesPersonRows: Record<string, string | number>[] = []
    for (const [person, products] of salesPersonMap) {
      for (const [productName, data] of products) {
        salesPersonRows.push({
          "Sales Person": person,
          Product: productName,
          Quantity: data.quantity,
          Value: data.value,
        })
      }
    }
    salesPersonRows.sort((a, b) => {
      const personA = String(a["Sales Person"])
      const personB = String(b["Sales Person"])
      if (personA === personB) {
        return String(a["Product"]).localeCompare(String(b["Product"]))
      }
      return personA.localeCompare(personB)
    })
    const spWs = XLSX.utils.json_to_sheet(salesPersonRows)
    XLSX.utils.sheet_add_aoa(
      spWs,
      [[`Values shown in ${report.currency.toUpperCase()} (${sym})`]],
      { origin: -1 }
    )
    autoFitColumns(spWs)
    XLSX.utils.book_append_sheet(wb, spWs, "By Sales Person")
  } else if (hasRecords) {
    const recordRows: Record<string, string | number>[] = []
    for (const r of report.records) {
      for (const item of r.items) {
        const row: Record<string, string | number> = {
          Date: r.date ? new Date(r.date).toLocaleString() : "—",
          Store: r.storeName,
          Product: item.product.name,
          Quantity: item.quantity,
          "Unit Price": item.price,
          Value: item.value,
        }
        if (r.invoiceNumber) row["Invoice #"] = r.invoiceNumber
        if (r.customerName) row["Customer"] = r.customerName
        if (r.salesName) row["Sales Person"] = r.salesName
        if (r.status) row["Status"] = r.status
        if (item.eur) row["EUR"] = item.eur
        if (item.usd) row["USD"] = item.usd
        if (item.birr) row["BIRR"] = item.birr
        if (item.visa) row["VISA"] = item.visa
        recordRows.push(row)
      }
    }
    const recordsWs = XLSX.utils.json_to_sheet(recordRows)
    XLSX.utils.sheet_add_aoa(
      recordsWs,
      [[`Values shown in ${report.currency.toUpperCase()} (${sym})`]],
      { origin: -1 }
    )
    autoFitColumns(recordsWs)
    XLSX.utils.book_append_sheet(wb, recordsWs, "All Records")
  } else if (hasBreakdown) {
    // Fallback for remaining products or if no detailed records available
    const detailRows = report.breakdown.map((item) => ({
      Product: item.product.name,
      Quantity: item.quantity,
      Value: item.value,
    }))
    const detailWs = XLSX.utils.json_to_sheet(detailRows)
    XLSX.utils.sheet_add_aoa(
      detailWs,
      [[`Values shown in ${report.currency.toUpperCase()} (${sym})`]],
      { origin: -1 }
    )
    autoFitColumns(detailWs)
    XLSX.utils.book_append_sheet(wb, detailWs, "Details")
  }

  // ============================================================
  // SHEET 2: Summary
  // ============================================================
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
  autoFitColumns(summaryWs)
  XLSX.utils.book_append_sheet(wb, summaryWs, "Summary")

  // ============================================================
  // SHEET 3: By Product
  // ============================================================
  if (hasBreakdown) {
    const productData = report.breakdown.map((item) => ({
      Product: item.product.name,
      Quantity: item.quantity,
      Value: item.value,
    }))
    const productWs = XLSX.utils.json_to_sheet(productData)
    XLSX.utils.sheet_add_aoa(
      productWs,
      [[`Values shown in ${report.currency.toUpperCase()} (${sym})`]],
      { origin: -1 }
    )
    autoFitColumns(productWs)
    XLSX.utils.book_append_sheet(wb, productWs, "By Product")
  }

  // ============================================================
  // SHEET 4: By Store
  // ============================================================
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
    autoFitColumns(storeWs)
    XLSX.utils.book_append_sheet(wb, storeWs, "By Store")
  }

  const fileName = `${report.type}_${report.start}_${report.end}.xlsx`
  XLSX.writeFile(wb, fileName)
}
