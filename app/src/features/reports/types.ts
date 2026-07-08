import type { CurrencyCode } from "@/features/currency/types"

export type ReportType = "sales" | "goodIns" | "stockouts" | "remaining"
export type ReportPeriod = "daily" | "weekly" | "monthly"

export type ReportSummary = {
  totalRecords: number
  totalItems: number
  totalValue: number
}

export type ReportBreakdownItem = {
  product: { _id: string; name: string }
  quantity: number
  value: number
}

export type ReportByStoreItem = {
  store: { _id: string; name: string }
  quantity: number
  value: number
  records: number
}

export type ReportTransactionItem = {
  product: { _id: string; name: string }
  quantity: number
  value: number
  eur: number
  usd: number
  birr: number
  visa: number
}

export type ReportTransaction = {
  _id: string
  invoiceNumber: string
  customerName?: string
  salesName?: string
  storeName: string
  date: string
  totalAmount: number
  items: ReportTransactionItem[]
}

export type ReportData = {
  type: ReportType
  period: ReportPeriod
  start: string
  end: string
  storeFilter: string | null
  summary: ReportSummary
  breakdown: ReportBreakdownItem[]
  byStore: ReportByStoreItem[]
  transactions: ReportTransaction[]
  currency: CurrencyCode
}

export type ReportParams = {
  type: ReportType
  period: ReportPeriod
  date: string
  store?: string
  currency?: CurrencyCode
  timezoneOffset?: number
}
