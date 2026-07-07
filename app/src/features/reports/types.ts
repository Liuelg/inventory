export type ReportType = "sales" | "goodIns" | "stockouts" | "remaining"
export type ReportPeriod = "daily" | "weekly" | "monthly"

export type CurrencyTotals = {
  eur: number
  usd: number
  birr: number
  visa: number
}

export type ReportSummary = {
  totalRecords: number
  totalItems: number
  totalValue: number
  totalValueByCurrency?: CurrencyTotals
}

export type ReportBreakdownItem = {
  product: { _id: string; name: string }
  quantity: number
  value: number
  valueByCurrency?: CurrencyTotals
}

export type ReportByStoreItem = {
  store: { _id: string; name: string }
  quantity: number
  value: number
  records: number
  valueByCurrency?: CurrencyTotals
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
}

export type ReportParams = {
  type: ReportType
  period: ReportPeriod
  date: string
  store?: string
}
