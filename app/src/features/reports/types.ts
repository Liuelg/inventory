import type { CurrencyCode } from "@/features/currency/types"

export type ReportType = "sales" | "goodIns" | "stockouts" | "remaining"

export type ReportSummary = {
  totalRecords: number
  totalItems: number
  totalValue: number
}

export type ReportBreakdownItem = {
  product: { _id: string; name: string; price?: number }
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
  product: { _id: string; name: string; price?: number }
  quantity: number
  value: number
  eur: number
  usd: number
  birr: number
  visa: number
  gbp: number
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

export type ReportRecordItem = {
  product: { _id: string; name: string; price?: number }
  quantity: number
  price: number
  value: number
  eur?: number
  usd?: number
  birr?: number
  visa?: number
  gbp?: number
}

export type ReportRecord = {
  _id: string
  date: string
  storeName: string
  items: ReportRecordItem[]
  totalValue: number
  invoiceNumber?: string
  customerName?: string
  salesName?: string
  status?: string
}

export type ReportData = {
  type: ReportType
  start: string
  end: string
  storeFilter: string | null
  summary: ReportSummary
  breakdown: ReportBreakdownItem[]
  byStore: ReportByStoreItem[]
  transactions: ReportTransaction[]
  records: ReportRecord[]
  currency: CurrencyCode
}

export type ReportParams = {
  type: ReportType
  startDate: string
  endDate: string
  store?: string
  currency?: CurrencyCode
  timezoneOffset?: number
}
