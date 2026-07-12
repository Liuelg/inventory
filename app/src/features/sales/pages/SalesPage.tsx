import { useState } from "react"
import { SalesTable } from "../components/SalesTable"
import { SalesForm } from "../components/SalesForm"
import { CurrencySelector } from "../components/CurrencySelector"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { useCurrencyRates } from "@/features/currency/hooks"
import type { Sale } from "../types"
import type { CurrencyCode } from "@/features/currency/types"

const DEFAULT_RATES = { eur: 1, usd: 1, birr: 1, visa: 1 }

export function SalesPage() {
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Sale | null>(null)
  const [displayCurrency, setDisplayCurrency] = useState<CurrencyCode>("usd")
  const { data: ratesData } = useCurrencyRates()

  const rates = ratesData?.data?.rates ?? DEFAULT_RATES

  const openAdd = () => {
    setEditing(null)
    setFormOpen(true)
  }

  const openEdit = (sale: Sale) => {
    setEditing(sale)
    setFormOpen(true)
  }

  return (
    <div className="flex w-full min-w-0 flex-col gap-4">
      <div className="flex w-full flex-col sm:flex-row items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Sales</h1>
          <p className="text-sm text-gray-500">Manage sales and invoices.</p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
          <CurrencySelector
            value={displayCurrency}
            onChange={setDisplayCurrency}
          />
          <Button onClick={openAdd} className="w-full sm:w-auto">
            <Plus data-icon="inline-start" />
            Add Sale
          </Button>
        </div>
      </div>
      <SalesTable
        onEdit={openEdit}
        displayCurrency={displayCurrency}
        rates={rates}
      />
      {formOpen ? (
        <SalesForm
          key={editing?._id ?? "new-sale"}
          open={formOpen}
          onOpenChange={setFormOpen}
          editing={editing}
          onSuccess={() => {
            setFormOpen(false)
            setEditing(null)
          }}
        />
      ) : null}
    </div>
  )
}
