import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { currencyApi } from "./api"
import type { CurrencyRatePayload } from "./types"

export function useCurrencyRates() {
  return useQuery({
    queryKey: ["currency-rates"],
    queryFn: () => currencyApi.getLatest(),
  })
}

export function useCurrencyRateHistory() {
  return useQuery({
    queryKey: ["currency-rates", "history"],
    queryFn: () => currencyApi.list(),
  })
}

export function useUpdateCurrencyRates() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: CurrencyRatePayload) => currencyApi.update(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["currency-rates"] })
    },
  })
}
