import { fetcher } from "@/lib/api-client"
import type { ReportData, ReportParams } from "./types"

export const reportApi = {
  generate: (params: ReportParams) => {
    const query = new URLSearchParams()
    query.set("type", params.type)
    query.set("period", params.period)
    query.set("date", params.date)
    if (params.store) query.set("store", params.store)
    if (params.currency) query.set("currency", params.currency)
    return fetcher<{ success: boolean; data: ReportData }>(
      `/api/reports?${query.toString()}`
    )
  },
}
