import * as XLSX from "xlsx"
import { getCurrencySymbol } from "./components/CurrencySelector"
import type { Sale, SaleItem } from "./types"
import type { CurrencyCode, CurrencyRates } from "@/features/currency/types"

function getStoreName(store: Sale["store"]): string {
  if (!store) return "-"
  if (typeof store === "string") return store
  return store.name || store._id || "-"
}

function getProductLabel(item: SaleItem): string {
  const name =
    typeof item.item_id === "object" && item.item_id !== null
      ? item.item_id.name || "Unknown Product"
      : "Unknown Product"
  const price = item.price
  if (price != null && price > 0) {
    return `${name} (${price.toFixed(2)})`
  }
  return name
}

function getItemProductId(item: SaleItem): string | null {
  if (typeof item.item_id === "object" && item.item_id !== null) {
    return item.item_id._id || null
  }
  if (typeof item.item_id === "string") {
    return item.item_id || null
  }
  return null
}

function convertCurrency(
  amount: number,
  from: CurrencyCode,
  to: CurrencyCode,
  rates: CurrencyRates
): number {
  if (from === to) return amount
  if (!rates || !rates[from] || !rates[to]) return amount
  const amountInBase = amount / rates[from]
  return amountInBase * rates[to]
}

function getItemConvertedTotal(
  item: SaleItem,
  targetCurrency: CurrencyCode,
  rates: CurrencyRates
): number {
  return (
    convertCurrency(item.eur || 0, "eur", targetCurrency, rates) +
    convertCurrency(item.usd || 0, "usd", targetCurrency, rates) +
    convertCurrency(item.birr || 0, "birr", targetCurrency, rates) +
    convertCurrency(item.visa || 0, "visa", targetCurrency, rates) +
    convertCurrency(item.gbp || 0, "gbp", targetCurrency, rates)
  )
}

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
  ws["!cols"] = colWidths.map((w) => ({ wch: Math.min(w, 50) }))
}

export function exportSalesToExcel(
  sales: Sale[],
  displayCurrency: CurrencyCode,
  rates: CurrencyRates,
  productFilter?: string
) {
  const wb = XLSX.utils.book_new()
  const sym = getCurrencySymbol(displayCurrency)
  const dateLabel = new Date().toLocaleDateString()

  // ── Sheet 1: By Sale ──
  const saleRows: Record<string, string | number>[] = []
  for (const sale of sales) {
    let items = sale.items
    if (productFilter) {
      items = sale.items.filter((item) => getItemProductId(item) === productFilter)
      if (items.length === 0) continue
    }
    const products = items.map(getProductLabel).join(", ")
    const totalItems = items.reduce((sum, item) => sum + item.quantity, 0)
    const convertedTotal = items.reduce(
      (sum, item) => sum + getItemConvertedTotal(item, displayCurrency, rates),
      0
    )
    saleRows.push({
      "Invoice #": sale.invoiceNumber || "—",
      Date: sale.date_time ? new Date(sale.date_time).toLocaleDateString() : "—",
      "Sales Person": sale.salesName || "—",
      Store: getStoreName(sale.store),
      Products: products,
      "Total Items": totalItems,
      [`Total (${sym})`]: Number(convertedTotal.toFixed(2)),
    })
  }
  const saleWs = XLSX.utils.json_to_sheet(saleRows)
  XLSX.utils.sheet_add_aoa(
    saleWs,
    [[`Values shown in ${displayCurrency.toUpperCase()} (${sym})`]],
    { origin: -1 }
  )
  autoFitColumns(saleWs)
  XLSX.utils.book_append_sheet(wb, saleWs, "By Sale")

  // ── Sheet 2: By Item ──
  const itemRows: Record<string, string | number>[] = []
  for (const sale of sales) {
    for (const item of sale.items) {
      if (productFilter && getItemProductId(item) !== productFilter) continue
      const converted = getItemConvertedTotal(item, displayCurrency, rates)
      itemRows.push({
        "Invoice #": sale.invoiceNumber || "—",
        Date: sale.date_time ? new Date(sale.date_time).toLocaleDateString() : "—",
        "Sales Person": sale.salesName || "—",
        Store: getStoreName(sale.store),
        Product: getProductLabel(item),
        Qty: item.quantity,
        [`Total (${sym})`]: Number(converted.toFixed(2)),
        EUR: item.eur || 0,
        USD: item.usd || 0,
        BIRR: item.birr || 0,
        VISA: item.visa || 0,
        GBP: item.gbp || 0,
      })
    }
  }
  const itemWs = XLSX.utils.json_to_sheet(itemRows)
  XLSX.utils.sheet_add_aoa(
    itemWs,
    [[`Values shown in ${displayCurrency.toUpperCase()} (${sym})`]],
    { origin: -1 }
  )
  autoFitColumns(itemWs)
  XLSX.utils.book_append_sheet(wb, itemWs, "By Item")

  // ── Sheet 3: By Sales Person ──
  const personMap = new Map<string, Map<string, { quantity: number; value: number }>>()
  for (const sale of sales) {
    const person = sale.salesName || "—"
    if (!personMap.has(person)) {
      personMap.set(person, new Map())
    }
    const productMap = personMap.get(person)!
    for (const item of sale.items) {
      if (productFilter && getItemProductId(item) !== productFilter) continue
      const name = getProductLabel(item)
      const converted = getItemConvertedTotal(item, displayCurrency, rates)
      const existing = productMap.get(name) || { quantity: 0, value: 0 }
      existing.quantity += item.quantity || 0
      existing.value += converted
      productMap.set(name, existing)
    }
  }

  const personRows: Record<string, string | number>[] = []
  for (const [person, products] of personMap) {
    for (const [productName, data] of products) {
      personRows.push({
        "Sales Person": person,
        Product: productName,
        Quantity: data.quantity,
        [`Total (${sym})`]: Number(data.value.toFixed(2)),
      })
    }
  }
  personRows.sort((a, b) => {
    const pa = String(a["Sales Person"])
    const pb = String(b["Sales Person"])
    if (pa === pb) {
      return String(a["Product"]).localeCompare(String(b["Product"]))
    }
    return pa.localeCompare(pb)
  })
  const personWs = XLSX.utils.json_to_sheet(personRows)
  XLSX.utils.sheet_add_aoa(
    personWs,
    [[`Values shown in ${displayCurrency.toUpperCase()} (${sym})`]],
    { origin: -1 }
  )
  autoFitColumns(personWs)
  XLSX.utils.book_append_sheet(wb, personWs, "By Sales Person")

  const fileName = `sales_export_${dateLabel}.xlsx`
  XLSX.writeFile(wb, fileName)
}
