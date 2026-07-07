import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import type { ReportData, ReportType, ReportPeriod } from "./types"

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

function getPeriodLabel(period: ReportPeriod): string {
  return period.charAt(0).toUpperCase() + period.slice(1)
}

function formatCurrency(value: number, symbol: string): string {
  return `${symbol}${value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

export function generateReportPDF(report: ReportData) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" })

  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = 14
  const contentWidth = pageWidth - margin * 2

  // Title
  doc.setFontSize(20)
  doc.setTextColor(33, 33, 33)
  doc.text("Inventory Report", pageWidth / 2, 20, { align: "center" })

  // Subtitle / Report Info
  doc.setFontSize(11)
  doc.setTextColor(80, 80, 80)
  const typeLabel = getReportTypeLabel(report.type)
  const periodLabel = getPeriodLabel(report.period)
  const dateRange = `${new Date(report.start).toLocaleDateString()} – ${new Date(report.end).toLocaleDateString()}`
  const storeText = report.storeFilter || "All Stores"

  doc.text(`Type: ${typeLabel}`, margin, 32)
  doc.text(`Period: ${periodLabel}`, margin, 38)
  doc.text(`Date Range: ${dateRange}`, margin, 44)
  doc.text(`Store: ${storeText}`, margin, 50)

  // Summary section
  doc.setFontSize(12)
  doc.setTextColor(33, 33, 33)
  doc.text("Summary", margin, 62)

  let summaryY = 68
  const colW = contentWidth / 3

  // Total Records
  doc.setFontSize(9)
  doc.setTextColor(100, 100, 100)
  doc.text("Total Records", margin, summaryY)
  doc.setFontSize(14)
  doc.setTextColor(33, 33, 33)
  doc.text(String(report.summary.totalRecords), margin, summaryY + 6)

  // Total Items
  doc.setFontSize(9)
  doc.setTextColor(100, 100, 100)
  doc.text("Total Items", margin + colW, summaryY)
  doc.setFontSize(14)
  doc.setTextColor(33, 33, 33)
  doc.text(String(report.summary.totalItems), margin + colW, summaryY + 6)

  // Total Value
  if (report.summary.totalValueByCurrency) {
    const currencies = report.summary.totalValueByCurrency
    const lines: string[] = []
    if (currencies.eur > 0) lines.push(formatCurrency(currencies.eur, "€"))
    if (currencies.usd > 0) lines.push(formatCurrency(currencies.usd, "$"))
    if (currencies.birr > 0) lines.push(formatCurrency(currencies.birr, "Br "))
    if (currencies.visa > 0) lines.push(formatCurrency(currencies.visa, "Visa $"))

    doc.setFontSize(9)
    doc.setTextColor(100, 100, 100)
    doc.text("Total Value", margin + colW * 2, summaryY)
    doc.setFontSize(10)
    doc.setTextColor(33, 33, 33)
    lines.forEach((line, i) => {
      doc.text(line, margin + colW * 2, summaryY + 5 + i * 4)
    })
    summaryY += 10 + Math.max(0, lines.length - 1) * 4
  } else {
    doc.setFontSize(9)
    doc.setTextColor(100, 100, 100)
    doc.text("Total Value", margin + colW * 2, summaryY)
    doc.setFontSize(14)
    doc.setTextColor(33, 33, 33)
    doc.text(
      formatCurrency(report.summary.totalValue, "$"),
      margin + colW * 2,
      summaryY + 6
    )
    summaryY += 12
  }

  let cursorY = summaryY + 6

  // By Product table
  if (report.breakdown.length > 0) {
    doc.setFontSize(12)
    doc.setTextColor(33, 33, 33)
    doc.text("By Product", margin, cursorY)
    cursorY += 4

    const hasCurrency = report.breakdown.some((item) => item.valueByCurrency)
    const head = hasCurrency
      ? [["Product", "Quantity", "EUR", "USD", "Birr", "Visa"]]
      : [["Product", "Quantity", "Value"]]

    const body = report.breakdown.map((item) => {
      if (hasCurrency) {
        const vc = item.valueByCurrency
        return [
          item.product.name,
          String(item.quantity),
          vc?.eur ? formatCurrency(vc.eur, "€") : "-",
          vc?.usd ? formatCurrency(vc.usd, "$") : "-",
          vc?.birr ? formatCurrency(vc.birr, "Br ") : "-",
          vc?.visa ? formatCurrency(vc.visa, "Visa $") : "-",
        ]
      }
      return [
        item.product.name,
        String(item.quantity),
        formatCurrency(item.value, "$"),
      ]
    })

    autoTable(doc, {
      startY: cursorY,
      head,
      body,
      theme: "striped",
      headStyles: {
        fillColor: [51, 51, 51],
        textColor: 255,
        fontStyle: "bold",
      },
      styles: { fontSize: 10, cellPadding: 2 },
      columnStyles: {
        0: { cellWidth: "auto" },
        1: { halign: "right" },
        2: { halign: "right" },
        ...(hasCurrency
          ? { 3: { halign: "right" }, 4: { halign: "right" }, 5: { halign: "right" } }
          : {}),
      },
      margin: { left: margin, right: margin },
    })

    cursorY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10
  }

  // By Store table
  if (report.byStore.length > 0) {
    // Check if we need a new page
    const pageHeight = doc.internal.pageSize.getHeight()
    if (cursorY > pageHeight - 40) {
      doc.addPage()
      cursorY = 20
    }

    doc.setFontSize(12)
    doc.setTextColor(33, 33, 33)
    doc.text("By Store", margin, cursorY)
    cursorY += 4

    const hasCurrency = report.byStore.some((item) => item.valueByCurrency)
    const head = hasCurrency
      ? [["Store", "Records", "Quantity", "EUR", "USD", "Birr", "Visa"]]
      : [["Store", "Records", "Quantity", "Value"]]

    const body = report.byStore.map((item) => {
      if (hasCurrency) {
        const vc = item.valueByCurrency
        return [
          item.store.name,
          String(item.records),
          String(item.quantity),
          vc?.eur ? formatCurrency(vc.eur, "€") : "-",
          vc?.usd ? formatCurrency(vc.usd, "$") : "-",
          vc?.birr ? formatCurrency(vc.birr, "Br ") : "-",
          vc?.visa ? formatCurrency(vc.visa, "Visa $") : "-",
        ]
      }
      return [
        item.store.name,
        String(item.records),
        String(item.quantity),
        formatCurrency(item.value, "$"),
      ]
    })

    autoTable(doc, {
      startY: cursorY,
      head,
      body,
      theme: "striped",
      headStyles: {
        fillColor: [51, 51, 51],
        textColor: 255,
        fontStyle: "bold",
      },
      styles: { fontSize: 10, cellPadding: 2 },
      columnStyles: {
        0: { cellWidth: "auto" },
        1: { halign: "right" },
        2: { halign: "right" },
        3: { halign: "right" },
        ...(hasCurrency
          ? { 4: { halign: "right" }, 5: { halign: "right" }, 6: { halign: "right" } }
          : {}),
      },
      margin: { left: margin, right: margin },
    })
  }

  // Footer
  const totalPages = doc.getNumberOfPages()
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setTextColor(150, 150, 150)
    doc.text(
      `Generated on ${new Date().toLocaleString()}  •  Page ${i} of ${totalPages}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 8,
      { align: "center" }
    )
  }

  const fileName = `${report.type}_${report.period}_${report.start}.pdf`
  doc.save(fileName)
}
