import { useState } from "react"
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
import type { ReportType, ReportPeriod, ReportParams } from "../types"
import { BarChart3 } from "lucide-react"

const REPORT_TYPES: { value: ReportType; label: string }[] = [
  { value: "sales", label: "Sales" },
  { value: "goodIns", label: "Stock In" },
  { value: "stockouts", label: "Stock Out" },
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
  const [type, setType] = useState<ReportType>("sales")
  const [period, setPeriod] = useState<ReportPeriod>("daily")
  const [date, setDate] = useState(formatDateInput(new Date()))
  const [store, setStore] = useState<string>("all")

  const { data: storesData } = useStores()

  const handleGenerate = () => {
    const params: ReportParams = {
      type,
      period,
      date,
    }
    if (store && store !== "all") {
      params.store = store
    }
    onGenerate(params)
  }

  return (
    <Card>
      <CardContent className="grid gap-4 pt-6 md:grid-cols-5">
        <div className="flex flex-col gap-2">
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

        <div className="flex flex-col gap-2">
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

        <div className="flex flex-col gap-2">
          <Label htmlFor="report-date">Date</Label>
          <Input
            id="report-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="report-store">Store (optional)</Label>
          <Select value={store} onValueChange={setStore}>
            <SelectTrigger id="report-store">
              <SelectValue placeholder="All stores" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Stores</SelectItem>
              {storesData?.map((s) => (
                <SelectItem key={s._id} value={s._id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-end">
          <Button onClick={handleGenerate} disabled={isLoading} className="w-full">
            <BarChart3 className="mr-2 h-4 w-4" />
            {isLoading ? "Generating..." : "Generate Report"}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
