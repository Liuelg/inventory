export type ReportType = "sales" | "goodIns" | "stockouts"
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
