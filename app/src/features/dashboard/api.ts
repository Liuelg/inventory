import { fetcher } from "@/lib/api-client"
import type { DailySalesRow, StoreDailyDetail } from "./types"

export const dashboardApi = {
  dailySales: () =>
    fetcher<{ success: boolean; data: DailySalesRow[] }>("/api/dashboard/daily-sales"),

  storeDaily: (storeId: string) =>
    fetcher<{ success: boolean; data: StoreDailyDetail }>(`/api/dashboard/store/${storeId}`),
}
