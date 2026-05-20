import { useQuery } from "@tanstack/react-query"
import { dashboardApi } from "./api"

export function useDailySales() {
  return useQuery({
    queryKey: ["dashboard", "daily-sales"],
    queryFn: async () => {
      const res = await dashboardApi.dailySales()
      return res.data
    },
  })
}

export function useStoreDaily(storeId: string) {
  return useQuery({
    queryKey: ["dashboard", "store", storeId],
    queryFn: async () => {
      const res = await dashboardApi.storeDaily(storeId)
      return res.data
    },
    enabled: !!storeId,
  })
}
