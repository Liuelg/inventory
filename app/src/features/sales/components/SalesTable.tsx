import { useState } from "react"
import { DataTable, type ColumnDef } from "@/components/Table.tsx"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Pencil, Trash2 } from "lucide-react"
import { useDeleteSale, useSales } from "../hooks"
import { ProductImageCell } from "@/components/ProductImageCell"
import { getCurrencySymbol } from "./CurrencySelector"
import type { Sale, SaleItem } from "../types"
import type { CurrencyCode, CurrencyRates } from "@/features/currency/types"

function getStoreName(store: Sale["store"]) {
  if (!store) return "-"
  if (typeof store === "string") return store
  return store.name || store._id || "-"
}

function getTotalItems(sale: Sale) {
  return sale.items.reduce((sum, item) => sum + item.quantity, 0)
}

function getProductName(item: SaleItem): string {
  if (typeof item.item_id === "object" && item.item_id !== null) {
    return item.item_id.name || "Unknown"
  }
  return "Unknown"
}

function getProductImage(item: SaleItem): string | undefined {
  if (item.image) return item.image
  if (typeof item.item_id === "object" && item.item_id !== null)
    return item.item_id.image
  return undefined
}

function getSaleCurrencies(sale: Sale): { label: string; total: number }[] {
  const sums = { eur: 0, usd: 0, birr: 0, visa: 0 }
  for (const item of sale.items) {
    sums.eur += (item.eur || 0) * item.quantity
    sums.usd += (item.usd || 0) * item.quantity
    sums.birr += (item.birr || 0) * item.quantity
    sums.visa += (item.visa || 0) * item.quantity
  }
  const map = [
    { label: "EUR", total: sums.eur },
    { label: "USD", total: sums.usd },
    { label: "BIRR", total: sums.birr },
    { label: "VISA", total: sums.visa },
  ]
  return map.filter((c) => c.total > 0)
}

function convertCurrency(
  amount: number,
  from: CurrencyCode,
  to: CurrencyCode,
  rates: CurrencyRates
): number {
  if (from === to) return amount
  if (!rates || !rates[from] || !rates[to]) return amount
  // Convert to base (USD) then to target
  const amountInBase = amount / rates[from]
  return amountInBase * rates[to]
}

function getConvertedTotal(
  sale: Sale,
  targetCurrency: CurrencyCode,
  latestRates: CurrencyRates
): number {
  // If the sale has stored rates, totalAmount is the USD-equivalent
  // computed at sale time. Convert it to the target currency using
  // the sale's own historical rates for consistency.
  if (sale.rates) {
    const safeRates = {
      eur: sale.rates.eur > 0 ? sale.rates.eur : 1,
      usd: sale.rates.usd > 0 ? sale.rates.usd : 1,
      birr: sale.rates.birr > 0 ? sale.rates.birr : 1,
      visa: sale.rates.visa > 0 ? sale.rates.visa : 1,
    }
    return sale.totalAmount * safeRates[targetCurrency]
  }

  // Fallback for old sales without stored rates:
  // convert each item's currencies using the latest rates.
  let total = 0
  for (const item of sale.items) {
    total += convertCurrency(
      (item.eur || 0) * item.quantity,
      "eur",
      targetCurrency,
      latestRates
    )
    total += convertCurrency(
      (item.usd || 0) * item.quantity,
      "usd",
      targetCurrency,
      latestRates
    )
    total += convertCurrency(
      (item.birr || 0) * item.quantity,
      "birr",
      targetCurrency,
      latestRates
    )
    total += convertCurrency(
      (item.visa || 0) * item.quantity,
      "visa",
      targetCurrency,
      latestRates
    )
  }
  return total
}

interface SalesTableProps {
  onEdit: (sale: Sale) => void
  displayCurrency: CurrencyCode
  rates: CurrencyRates
}

export function SalesTable({ onEdit, displayCurrency, rates }: SalesTableProps) {
  const { data: sales, isLoading } = useSales()
  const remove = useDeleteSale()
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const columns: ColumnDef<Sale>[] = [
    {
      header: "Invoice",
      cell: (sale) => (
        <span className="font-medium">{sale.invoiceNumber || "-"}</span>
      ),
      className: "w-[120px]",
    },
    {
      header: "Products",
      cell: (sale) => {
        const names = sale.items.map(getProductName)
        const images = sale.items.map(getProductImage).filter(Boolean) as string[]
        return (
          <div className="flex items-start gap-2 w-full">
            {images.length > 0 && (
              <ProductImageCell
                image={images[0]}
                altName={names[0] || "Product image"}
              />
            )}
            <div className="flex flex-col w-full min-w-0">
              <span className="text-sm leading-tight break-words whitespace-normal">
                {names.join(", ") || "—"}
              </span>
            </div>
          </div>
        )
      },
      className: "w-[180px] whitespace-normal align-top",
    },
    {
      header: "Customer",
      cell: (sale) => sale.customerName || "-",
    },
    {
      header: "Sales Person",
      cell: (sale) => sale.salesName || "-",
    },
    {
      header: "Store",
      cell: (sale) => getStoreName(sale.store),
    },
    {
      header: "Items",
      cell: (sale) => getTotalItems(sale),
      className: "w-[60px] text-right",
    },
    {
      header: "Total",
      cell: (sale) => {
        const currencies = getSaleCurrencies(sale)
        const converted = getConvertedTotal(sale, displayCurrency, rates)
        return (
          <div className="text-right">
            <div className="font-medium">
              {getCurrencySymbol(displayCurrency)}{converted.toFixed(2)}
            </div>
            {currencies.length > 0 && (
              <div className="flex justify-end gap-1 mt-0.5">
                {currencies.map((c) => (
                  <span
                    key={c.label}
                    className="inline-flex items-center rounded-sm bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground"
                  >
                    {c.label} {c.total.toFixed(0)}
                  </span>
                ))}
              </div>
            )}
          </div>
        )
      },
      className: "w-[140px] text-right whitespace-nowrap",
    },
    {
      header: "Date",
      cell: (sale) =>
        sale.date_time
          ? new Date(sale.date_time).toLocaleDateString()
          : "-",
      className: "w-[120px]",
    },
    {
      header: "Actions",
      className: "w-[120px] text-right",
      cell: (sale) => (
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={() => onEdit(sale)}>
            <Pencil />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive"
            onClick={() => setDeleteId(sale._id)}
          >
            <Trash2 />
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-4">
      <DataTable
        data={sales ?? []}
        columns={columns}
        keyExtractor={(sale) => sale._id}
        loading={isLoading}
        emptyMessage="No sales found."
      />

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action permanently deletes this sale record.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteId(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deleteId) remove.mutate(deleteId)
                setDeleteId(null)
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
