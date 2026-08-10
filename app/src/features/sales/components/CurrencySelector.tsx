import { useState } from "react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Settings, RefreshCw } from "lucide-react"
import { useCurrencyRates, useUpdateCurrencyRates, useSyncCurrencyRates } from "@/features/currency/hooks"
import { useAuthSession } from "@/hooks/use-auth-session"
import type { CurrencyCode, CurrencyRates } from "@/features/currency/types"

const CURRENCY_LABELS: Record<CurrencyCode, string> = {
  eur: "EUR (€)",
  usd: "USD ($)",
  birr: "Birr (Br)",
  visa: "Visa ($)",
  gbp: "GBP (£)",
}

const CURRENCY_SYMBOLS: Record<CurrencyCode, string> = {
  eur: "€",
  usd: "$",
  birr: "Br",
  visa: "Visa $",
  gbp: "£",
}

type Props = {
  value: CurrencyCode
  onChange: (value: CurrencyCode) => void
}

export function getCurrencySymbol(code: CurrencyCode): string {
  return CURRENCY_SYMBOLS[code]
}

export function CurrencySelector({ value, onChange }: Props) {
  const { data: session } = useAuthSession()
  const isAdmin = session?.role === "admin"
  const { data: ratesData } = useCurrencyRates()
  const updateRates = useUpdateCurrencyRates()
  const syncRates = useSyncCurrencyRates()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [formRates, setFormRates] = useState<CurrencyRates>({
    eur: 1,
    usd: 1,
    birr: 1,
    visa: 1,
    gbp: 1,
  })

  const latestRates = ratesData?.data?.rates

  function openSettings() {
    if (latestRates) {
      setFormRates({ ...latestRates })
    }
    setSettingsOpen(true)
  }

  function handleSave() {
    updateRates.mutate(
      { base: "USD", rates: formRates },
      {
        onSuccess: () => setSettingsOpen(false),
      }
    )
  }

  return (
    <>
      <div className="flex items-center gap-2">
        <Select value={value} onValueChange={(v) => onChange(v as CurrencyCode)}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Select currency" />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(CURRENCY_LABELS) as CurrencyCode[]).map((code) => (
              <SelectItem key={code} value={code}>
                {CURRENCY_LABELS[code]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {isAdmin && (
          <Button
            variant="ghost"
            size="icon"
            onClick={openSettings}
            title="Edit exchange rates"
          >
            <Settings className="h-4 w-4" />
          </Button>
        )}
      </div>

      {isAdmin && (
        <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
          <DialogContent className="sm:max-w-[400px]">
            <DialogHeader>
              <DialogTitle>Exchange Rates</DialogTitle>
              <DialogDescription>
                Set how much 1 USD equals in each currency. These rates are used
                to convert sale totals. "Sync from Frankfurter" fetches EUR
                automatically — Birr must be entered manually.
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-3 py-2">
              <p className="text-xs text-muted-foreground">
                Example: if 1 USD = 55 Birr, enter 55 for BIRR.
              </p>
              {(Object.keys(formRates) as CurrencyCode[]).map((code) => (
                <div key={code} className="grid gap-1.5">
                  <Label htmlFor={`rate-${code}`}>{CURRENCY_LABELS[code]}</Label>
                  <Input
                    id={`rate-${code}`}
                    type="number"
                    min="0.0001"
                    step="any"
                    value={formRates[code]}
                    onChange={(e) =>
                      setFormRates((prev) => ({
                        ...prev,
                        [code]: Number(e.target.value) || 0,
                      }))
                    }
                  />
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  syncRates.mutate(undefined, {
                    onSuccess: (res) => {
                      if (res.data?.rates) {
                        setFormRates({ ...res.data.rates })
                      }
                    },
                  })
                }}
                disabled={syncRates.isPending}
                title="Fetch latest rates from Frankfurter API"
              >
                <RefreshCw className={`mr-1 h-3.5 w-3.5 ${syncRates.isPending ? "animate-spin" : ""}`} />
                {syncRates.isPending ? "Syncing..." : "Sync from Frankfurter"}
              </Button>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => setSettingsOpen(false)}
                >
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={updateRates.isPending}>
                  {updateRates.isPending ? "Saving..." : "Save Rates"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}
