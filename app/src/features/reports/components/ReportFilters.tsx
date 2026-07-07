import { useState, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useStores } from "@/features/stores/hooks"
import { useAuthSession } from "@/hooks/use-auth-session.ts"
import type { ReportType, ReportPeriod, ReportParams } from "../types"
import type { CurrencyCode } from "@/features/currency/types"
import { BarChart3 } from "lucide-react"

const REPORT_TYPES: { value: ReportType; label: string }[] = [
  { value: "sales", label: "Sales" },
  { value: "goodIns", label: "Stock In" },
  { value: "stockouts", label: "Stock Out" },
  { value: "remaining", label: "Remaining Products" },
]

const PERIODS: { value: ReportPeriod; label: string }[] = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
]

function formatDateInput(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

type Props = {
  onGenerate: (params: ReportParams) => void
  isLoading: boolean
}

export function ReportFilters({ onGenerate, isLoading }: Props) {
  const { data: session } = useAuthSession()
  const isAdmin = session?.role === "admin"
  const userStore = session?.store

  const [type, setType] = useState<ReportType>("sales")
  const [period, setPeriod] = useState<ReportPeriod>("daily")
  const [date, setDate] = useState(formatDateInput(new Date()))
  const [store, setStore] = useState<string>(userStore || "all")
  const [currency, setCurrency] = useState<CurrencyCode>("usd")

  const { data: storesData } = useStores()

  const storeLabel = useMemo(() => {
    if (isAdmin) return "Store (optional)"
    return "Store"
  }, [isAdmin])

  const handleGenerate = () => {
    const params: ReportParams = {
      type,
      period,
      date,
      currency,
    }
    const effectiveStore = isAdmin ? store : userStore
    if (effectiveStore && effectiveStore !== "all") {
      params.store = effectiveStore
    }
    onGenerate(params)
  }

  return (
    <Card>
      <CardContent className="flex w-full flex-col sm:flex-row sm:divide-x sm:divide-border pt-6 gap-4 sm:gap-0">
        <div className="flex flex-1 flex-col gap-2 px-0 sm:px-4 py-0 sm:py-2">
          <Label htmlFor="report-type">Report Type</Label>
          <Select value={type} onValueChange={(v) => setType(v as ReportType)}>
            <SelectTrigger id="report-type">
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              {REPORT_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {type !== "remaining" && (
          <>
            <div className="flex flex-1 flex-col gap-2 px-0 sm:px-4 py-0 sm:py-2">
              <Label htmlFor="report-period">Period</Label>
              <Select
                value={period}
                onValueChange={(v) => setPeriod(v as ReportPeriod)}
              >
                <SelectTrigger id="report-period">
                  <SelectValue placeholder="Select period" />
                </SelectTrigger>
                <SelectContent>
                  {PERIODS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-1 flex-col gap-2 px-0 sm:px-4 py-0 sm:py-2">
              <Label htmlFor="report-date">Date</Label>
              <Input
                id="report-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
          </>
        )}

        <div className="flex flex-1 flex-col gap-2 px-0 sm:px-4 py-0 sm:py-2">
          <Label htmlFor="report-store">{storeLabel}</Label>
          <Select
            value={isAdmin ? store : userStore || "all"}
            onValueChange={setStore}
            disabled={!isAdmin}
          >
            <SelectTrigger id="report-store">
              <SelectValue placeholder="All stores" />
            </SelectTrigger>
            <SelectContent>
              {isAdmin && <SelectItem value="all">All Stores</SelectItem>}
              {storesData?.map((s) => (
                <SelectItem key={s._id} value={s._id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-1 flex-col gap-2 px-0 sm:px-4 py-0 sm:py-2">
          <Label htmlFor="report-currency">Currency</Label>
          <Select
            value={currency}
            onValueChange={(v) => setCurrency(v as CurrencyCode)}
          >
            <SelectTrigger id="report-currency">
              <SelectValue placeholder="Select currency" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="usd">USD ($)</SelectItem>
              <SelectItem value="eur">EUR (€)</SelectItem>
              <SelectItem value="birr">Birr (Br)</SelectItem>
              <SelectItem value="visa">Visa ($)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-1 items-end px-0 sm:px-4 py-0 sm:py-2">
          <Button onClick={handleGenerate} disabled={isLoading} className="w-full">
            <BarChart3 className="mr-2 h-4 w-4" />
            {isLoading ? "Generating..." : "Generate Report"}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
