import { useState, useMemo } from "react"
import { SalesTable } from "../components/SalesTable"
import { SalesForm } from "../components/SalesForm"
import { CurrencySelector } from "../components/CurrencySelector"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Plus, ListFilter, X } from "lucide-react"
import { useCurrencyRates } from "@/features/currency/hooks"
import { useSales } from "../hooks"
import { useCategories } from "@/features/categories/hooks"
import type { Sale, SaleLineItemRow } from "../types"
import type { CurrencyCode } from "@/features/currency/types"

const DEFAULT_RATES = { eur: 1, usd: 1, birr: 1, visa: 1 }

function getSaleCategoryIds(sale: Sale): string[] {
  const ids: string[] = []
  for (const item of sale.items) {
    if (typeof item.item_id === "object" && item.item_id !== null) {
      const cat = item.item_id.category
      if (typeof cat === "string") {
        if (cat) ids.push(cat)
      } else if (cat && typeof cat === "object" && "_id" in cat) {
        ids.push(cat._id)
      }
    }
  }
  return [...new Set(ids)]
}

function getItemCategoryId(item: Sale["items"][number]): string | null {
  if (typeof item.item_id === "object" && item.item_id !== null) {
    const cat = item.item_id.category
    if (typeof cat === "string") {
      return cat || null
    } else if (cat && typeof cat === "object" && "_id" in cat) {
      return cat._id
    }
  }
  return null
}

export function SalesPage() {
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Sale | null>(null)
  const [displayCurrency, setDisplayCurrency] = useState<CurrencyCode>("usd")
  const { data: ratesData } = useCurrencyRates()

  // Filters
  const [showFilters, setShowFilters] = useState(false)
  const [salesPerson, setSalesPerson] = useState<string>("all")
  const [startDate, setStartDate] = useState<string>("")
  const [endDate, setEndDate] = useState<string>("")
  const [category, setCategory] = useState<string>("all")

  const activeFilterCount = useMemo(() => {
    let count = 0
    if (salesPerson !== "all") count++
    if (startDate) count++
    if (endDate) count++
    if (category !== "all") count++
    return count
  }, [salesPerson, startDate, endDate, category])

  const { data: sales, isLoading } = useSales()
  const { data: categories } = useCategories()

  const rates = ratesData?.data?.rates ?? DEFAULT_RATES

  const salesPersons = useMemo(() => {
    if (!sales) return []
    const names = new Set<string>()
    for (const s of sales) {
      if (s.salesName) names.add(s.salesName)
    }
    return [...names].sort()
  }, [sales])

  const filteredSales = useMemo(() => {
    if (!sales) return []
    let result = [...sales]

    if (salesPerson && salesPerson !== "all") {
      result = result.filter((s) => s.salesName === salesPerson)
    }

    if (startDate) {
      const start = new Date(startDate)
      start.setHours(0, 0, 0, 0)
      result = result.filter((s) => new Date(s.date_time) >= start)
    }

    if (endDate) {
      const end = new Date(endDate)
      end.setHours(23, 59, 59, 999)
      result = result.filter((s) => new Date(s.date_time) <= end)
    }

    if (category && category !== "all") {
      result = result.filter((s) => getSaleCategoryIds(s).includes(category))
    }

    return result
  }, [sales, salesPerson, startDate, endDate, category])

  const lineItems: SaleLineItemRow[] | undefined = useMemo(() => {
    if (category === "all" || !category) return undefined
    const rows: SaleLineItemRow[] = []
    for (const sale of filteredSales) {
      for (let i = 0; i < sale.items.length; i++) {
        const item = sale.items[i]
        if (getItemCategoryId(item) === category) {
          rows.push({
            _id: `${sale._id}-${item._id ?? i}`,
            sale,
            item,
          })
        }
      }
    }
    return rows
  }, [filteredSales, category])

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
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters((v) => !v)}
            className="relative w-full sm:w-auto"
          >
            <ListFilter className="mr-1 h-4 w-4" />
            Filters
            {activeFilterCount > 0 && (
              <span className="ml-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-medium text-primary-foreground">
                {activeFilterCount}
              </span>
            )}
          </Button>
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

      {showFilters && (
        <div className="flex flex-col gap-3 rounded-lg border border-border bg-background p-4 sm:flex-row sm:items-end">
          <div className="grid gap-1.5 w-full sm:w-[200px]">
            <Label className="text-xs text-muted-foreground">
              Sales Person
            </Label>
            <Select value={salesPerson} onValueChange={setSalesPerson}>
              <SelectTrigger>
                <SelectValue placeholder="All sales persons" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {salesPersons.map((name) => (
                  <SelectItem key={name} value={name}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-1.5 w-full sm:w-[160px]">
            <Label className="text-xs text-muted-foreground">Start Date</Label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>

          <div className="grid gap-1.5 w-full sm:w-[160px]">
            <Label className="text-xs text-muted-foreground">End Date</Label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>

          <div className="grid gap-1.5 w-full sm:w-[200px]">
            <Label className="text-xs text-muted-foreground">
              Product Category
            </Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue placeholder="All categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {categories?.map((c) => (
                  <SelectItem key={c._id} value={c._id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {activeFilterCount > 0 && (
            <div className="flex items-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSalesPerson("all")
                  setStartDate("")
                  setEndDate("")
                  setCategory("all")
                }}
              >
                <X className="mr-1 h-4 w-4" />
                Clear
              </Button>
            </div>
          )}
        </div>
      )}

      <SalesTable
        sales={filteredSales}
        lineItems={lineItems}
        isLoading={isLoading}
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
