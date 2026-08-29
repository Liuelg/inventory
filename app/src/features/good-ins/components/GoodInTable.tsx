import { useState } from "react"
import { DataTable, type ColumnDef } from "@/components/Table.tsx"
import { Button } from "@/components/ui/button.tsx"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog.tsx"
import { useAuthSession } from "@/hooks/use-auth-session.ts"
import {
  useAcceptStockout,
  useRejectStockout,
  useStockouts,
} from "@/features/stockouts/hooks"
import type { Stockout, StockoutItemPopulated } from "@/features/stockouts/types"
import { Eye, Check, X } from "lucide-react"
import { ProductImageCell } from "@/components/ProductImageCell"

function getStoreName(store: Stockout["store"]) {
  if (!store) return "-"
  if (typeof store === "string") return store
  return store.name || store._id || "-"
}

function getUserName(user: Stockout["accepted_by"] | Stockout["created_by"]) {
  if (!user) return "-"
  if (typeof user === "string") return user
  return user.name || user.email || "-"
}

function getTotalItems(stockout: Stockout) {
  return stockout.items.reduce((sum, item) => sum + item.quantity, 0)
}

function getTotalAmount(stockout: Stockout) {
  return stockout.items.reduce(
    (sum, item) => sum + item.quantity * item.price,
    0
  )
}

function StatusBadge({ status }: { status: Stockout["status"] }) {
  const classes = {
    pending:
      "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    accepted:
      "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    rejected: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  }

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${classes[status]}`}
    >
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  )
}

function ItemRow({ item }: { item: StockoutItemPopulated }) {
  const product = typeof item.item_id === "string" ? null : item.item_id
  const name = product
    ? `${product.name} (${item.price}${product.price?.currency ? " " + product.price.currency : ""})`
    : String(item.item_id)
  const image =
    typeof item.item_id === "string" ? undefined : item.item_id.image
  return (
    <div className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
      <div className="flex items-center gap-3">
        <ProductImageCell image={image} altName={name || "Product image"} />
        <span className="font-medium">{name}</span>
      </div>
      <span className="text-muted-foreground">
        {item.quantity} × {item.price.toFixed(2)}
      </span>
    </div>
  )
}

export function GoodInTable() {
  const { data: stockouts, isLoading } = useStockouts()
  const { data: session } = useAuthSession()
  const isAdmin = session?.role === "admin"
  const accept = useAcceptStockout()
  const reject = useRejectStockout()
  const [viewing, setViewing] = useState<Stockout | null>(null)

  const columns: ColumnDef<Stockout>[] = [
    {
      header: "ID",
      cell: (s) => <span className="font-medium">{s._id.slice(-6)}</span>,
      className: "w-[80px]",
    },
    {
      header: "Store",
      cell: (s) => getStoreName(s.store),
    },
    {
      header: "Items",
      cell: (s) => (
        <Button
          variant="ghost"
          size="sm"
          className="h-auto px-2 py-0.5 text-xs font-medium"
          onClick={(e) => {
            e.stopPropagation()
            setViewing(s)
          }}
        >
          {getTotalItems(s)} items
        </Button>
      ),
      className: "w-[80px] text-right",
    },
    {
      header: "Total",
      cell: (s) => getTotalAmount(s).toFixed(2),
      className: "w-[100px] text-right whitespace-nowrap",
    },
    {
      header: "Status",
      cell: (s) => <StatusBadge status={s.status} />,
      className: "w-[100px]",
    },
    {
      header: "Date",
      cell: (s) =>
        s.date ? new Date(s.date).toLocaleDateString() : "-",
      className: "w-[120px]",
    },
    {
      header: "Actions",
      className: "w-[140px] text-right",
      cell: (s) => {
        const isPending = s.status === "pending"
        return (
          <div className="flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
            {isPending && !isAdmin ? (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-green-600"
                  title="Accept"
                  onClick={() => {
                    if (session?.id) {
                      accept.mutate({ id: s._id, accepted_by: session.id })
                    }
                  }}
                >
                  <Check />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive"
                  title="Reject"
                  onClick={() => reject.mutate(s._id)}
                >
                  <X />
                </Button>
              </>
            ) : null}
            <Button
              variant="ghost"
              size="sm"
              title="View Details"
              onClick={() => setViewing(s)}
            >
              <Eye />
            </Button>
          </div>
        )
      },
    },
  ]

  const viewingTotal = viewing
    ? viewing.items.reduce(
        (sum, item) => sum + item.quantity * item.price,
        0
      )
    : 0

  return (
    <div className="flex flex-col gap-4">
      <DataTable
        data={stockouts ?? []}
        columns={columns}
        keyExtractor={(s) => s._id}
        loading={isLoading}
        emptyMessage="No incoming stock requests."
        onRowClick={(s) => setViewing(s)}
      />

      <Dialog open={!!viewing} onOpenChange={() => setViewing(null)}>
        <DialogContent className="max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Stock In Request</DialogTitle>
            <DialogDescription>
              Details of the stock transfer from the warehouse.
            </DialogDescription>
          </DialogHeader>

          {viewing ? (
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Store</p>
                  <p className="font-medium">{getStoreName(viewing.store)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Status</p>
                  <StatusBadge status={viewing.status} />
                </div>
                <div>
                  <p className="text-muted-foreground">Date</p>
                  <p className="font-medium">
                    {viewing.date
                      ? new Date(viewing.date).toLocaleDateString()
                      : "-"}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Total Amount</p>
                  <p className="font-medium">{viewingTotal.toFixed(2)}</p>
                </div>
              </div>

              {viewing.status === "accepted" && viewing.accepted_by ? (
                <div className="text-sm">
                  <p className="text-muted-foreground">Approved By</p>
                  <p className="font-medium">{getUserName(viewing.accepted_by)}</p>
                </div>
              ) : null}
              {viewing.status === "accepted" && viewing.accepted_at ? (
                <div className="text-sm">
                  <p className="text-muted-foreground">Approved At</p>
                  <p className="font-medium">
                    {new Date(viewing.accepted_at).toLocaleString()}
                  </p>
                </div>
              ) : null}
              {viewing.note ? (
                <div className="text-sm">
                  <p className="text-muted-foreground">Note</p>
                  <p className="font-medium">{viewing.note}</p>
                </div>
              ) : null}

              <div className="flex flex-col gap-2">
                <p className="text-sm font-medium">Items</p>
                {viewing.items.map((item, idx) => (
                  <ItemRow key={idx} item={item} />
                ))}
              </div>

              {viewing.status === "pending" && !isAdmin ? (
                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    variant="outline"
                    className="text-destructive"
                    onClick={() => {
                      reject.mutate(viewing._id)
                      setViewing(null)
                    }}
                  >
                    <X className="mr-1 size-4" />
                    Reject
                  </Button>
                  <Button
                    onClick={() => {
                      if (session?.id) {
                        accept.mutate({
                          id: viewing._id,
                          accepted_by: session.id,
                        })
                        setViewing(null)
                      }
                    }}
                  >
                    <Check className="mr-1 size-4" />
                    Accept
                  </Button>
                </div>
              ) : null}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  )
}
