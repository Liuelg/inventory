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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Pencil, Trash2, Eye } from "lucide-react"
import { useDeleteSale } from "../hooks"
import { useAuthSession } from "@/hooks/use-auth-session"
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
    sums.eur += item.eur || 0
    sums.usd += item.usd || 0
    sums.birr += item.birr || 0
    sums.visa += item.visa || 0
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

function hasRealRates(rates?: CurrencyRates): boolean {
  if (!rates) return false
  // Rates are "real" if at least one is not the default of 1
  return rates.eur !== 1 || rates.usd !== 1 || rates.birr !== 1 || rates.visa !== 1
}

function getConvertedTotal(
  sale: Sale,
  targetCurrency: CurrencyCode,
  latestRates: CurrencyRates
): number {
  // If the sale has REAL stored rates (not all 1s), totalAmount is the
  // USD-equivalent computed at sale time. Convert it using those rates.
  if (sale.rates && hasRealRates(sale.rates)) {
    const safeRates = {
      eur: sale.rates.eur > 0 ? sale.rates.eur : 1,
      usd: sale.rates.usd > 0 ? sale.rates.usd : 1,
      birr: sale.rates.birr > 0 ? sale.rates.birr : 1,
      visa: sale.rates.visa > 0 ? sale.rates.visa : 1,
    }
    return sale.totalAmount * safeRates[targetCurrency]
  }

  // Fallback for old sales with fake stored rates (all 1s) or no rates:
  // convert each item's currencies using the latest live rates.
  let total = 0
  for (const item of sale.items) {
    total += convertCurrency(item.eur || 0, "eur", targetCurrency, latestRates)
    total += convertCurrency(item.usd || 0, "usd", targetCurrency, latestRates)
    total += convertCurrency(item.birr || 0, "birr", targetCurrency, latestRates)
    total += convertCurrency(item.visa || 0, "visa", targetCurrency, latestRates)
  }
  return total
}

function getItemPriceBreakdown(item: SaleItem): string {
  const parts: string[] = []
  if (item.eur) parts.push(`€${item.eur}`)
  if (item.usd) parts.push(`$${item.usd}`)
  if (item.birr) parts.push(`Br${item.birr}`)
  if (item.visa) parts.push(`Visa $${item.visa}`)
  return parts.join(" | ") || "—"
}

interface SalesTableProps {
  sales: Sale[]
  isLoading?: boolean
  onEdit: (sale: Sale) => void
  displayCurrency: CurrencyCode
  rates: CurrencyRates
}

export function SalesTable({ sales, isLoading, onEdit, displayCurrency, rates }: SalesTableProps) {
  const remove = useDeleteSale()
  const { data: user } = useAuthSession()
  const isAdmin = user?.role === "admin"
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [detailSale, setDetailSale] = useState<Sale | null>(null)

  const columns: ColumnDef<Sale>[] = [
    {
      header: "Invoice",
      cell: (sale) => (
        <span className="font-medium">{sale.invoiceNumber || "-"}</span>
      ),
      className: "w-[72px] sm:w-[120px]",
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
      className: "max-w-[100px] sm:max-w-[180px] !whitespace-normal align-top break-words",
    },
    {
      header: "Customer",
      cell: (sale) => sale.customerName || "-",
      className: "hidden sm:table-cell",
    },
    {
      header: "Sales Person",
      cell: (sale) => sale.salesName || "-",
    },
    {
      header: "Store",
      cell: (sale) => getStoreName(sale.store),
      className: "hidden md:table-cell",
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
      className: "w-[100px] sm:w-[140px] text-right whitespace-nowrap",
    },
    {
      header: "Date",
      cell: (sale) =>
        sale.date_time
          ? new Date(sale.date_time).toLocaleDateString()
          : "-",
      className: "w-[120px] hidden sm:table-cell",
    },
    {
      header: "Actions",
      className: "w-auto sm:w-[140px] text-right",
      cell: (sale) => (
        <div className="flex justify-end gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setDetailSale(sale)}
            title="View details"
          >
            <Eye />
          </Button>
          {isAdmin && (
            <Button variant="ghost" size="sm" onClick={() => onEdit(sale)}>
              <Pencil />
            </Button>
          )}
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
    <div className="flex flex-col gap-4">
      <DataTable
        data={sales}
        columns={columns}
        keyExtractor={(sale) => sale._id}
        loading={isLoading ?? false}
        emptyMessage="No sales found."
      />

      {/* Sale Detail Dialog */}
      <Dialog open={!!detailSale} onOpenChange={() => setDetailSale(null)}>
        <DialogContent className="max-h-[90vh] overflow-auto max-w-[700px]">
          {detailSale && (
            <>
              <DialogHeader>
                <DialogTitle>Sale #{detailSale.invoiceNumber}</DialogTitle>
                <DialogDescription>
                  {detailSale.customerName
                    ? `Customer: ${detailSale.customerName}`
                    : "No customer name"}
                  {" · "}
                  {detailSale.date_time
                    ? new Date(detailSale.date_time).toLocaleString()
                    : "—"}
                </DialogDescription>
              </DialogHeader>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Store:</span>{" "}
                  <span className="font-medium">
                    {getStoreName(detailSale.store)}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Sales Person:</span>{" "}
                  <span className="font-medium">
                    {detailSale.salesName || "—"}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Total Items:</span>{" "}
                  <span className="font-medium">
                    {getTotalItems(detailSale)}
                  </span>
                </div>
              </div>

              <div className="mt-2">
                <h4 className="text-sm font-semibold mb-2">Items</h4>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead className="text-right">Qty</TableHead>
                        <TableHead className="text-right">Payment</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {detailSale.items.map((item, idx) => (
                        <TableRow key={idx}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {getProductImage(item) && (
                                <ProductImageCell
                                  image={getProductImage(item)}
                                  altName={getProductName(item)}
                                />
                              )}
                              <span className="font-medium text-sm">
                                {getProductName(item)}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            {item.quantity}
                          </TableCell>
                          <TableCell className="text-right text-xs text-muted-foreground">
                            {getItemPriceBreakdown(item)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

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
