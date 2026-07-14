import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import type { ReportData, ReportType } from "./types"

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
  const dateRange = `${new Date(report.start).toLocaleDateString()} – ${new Date(report.end).toLocaleDateString()}`
  const storeText = report.storeFilter || "All Stores"

  doc.text(`Type: ${typeLabel}`, margin, 32)
  doc.text(`Date Range: ${dateRange}`, margin, 38)
  doc.text(`Store: ${storeText}`, margin, 44)

  // Summary section
  doc.setFontSize(12)
  doc.setTextColor(33, 33, 33)
  doc.text("Summary", margin, 56)

  const summaryY = 62
  const colW = contentWidth / 3
  const summaryData = [
    {
      label: "Total Records",
      value: String(report.summary.totalRecords),
    },
    {
      label: "Total Items",
      value: String(report.summary.totalItems),
    },
    {
      label: "Total Value",
      value: `$${report.summary.totalValue.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`,
    },
  ]

  summaryData.forEach((item, i) => {
    const x = margin + i * colW
    doc.setFontSize(9)
    doc.setTextColor(100, 100, 100)
    doc.text(item.label, x, summaryY)
    doc.setFontSize(14)
    doc.setTextColor(33, 33, 33)
    doc.text(item.value, x, summaryY + 6)
  })

  let cursorY = summaryY + 18

  // By Product table
  if (report.breakdown.length > 0) {
    doc.setFontSize(12)
    doc.setTextColor(33, 33, 33)
    doc.text("By Product", margin, cursorY)
    cursorY += 4

    autoTable(doc, {
      startY: cursorY,
      head: [["Product", "Quantity", "Value"]],
      body: report.breakdown.map((item) => [
        item.product.name,
        String(item.quantity),
        `$${item.value.toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`,
      ]),
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

    autoTable(doc, {
      startY: cursorY,
      head: [["Store", "Records", "Quantity", "Value"]],
      body: report.byStore.map((item) => [
        item.store.name,
        String(item.records),
        String(item.quantity),
        `$${item.value.toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`,
      ]),
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

  const fileName = `${report.type}_${report.start}_${report.end}.pdf`
  doc.save(fileName)
}
