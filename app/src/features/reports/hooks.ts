import { useQuery } from "@tanstack/react-query"
import { reportApi } from "./api"
import type { ReportParams } from "./types"

export function useReport(params: ReportParams | null) {
  return useQuery({
    queryKey: ["reports", params],
    queryFn: () => reportApi.generate(params!),
    enabled: !!params,
  })
}
