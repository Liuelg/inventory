import { useMemo } from "react"
import { DataTable, type ColumnDef } from "@/components/Table.tsx"
import { useAuthSession } from "@/hooks/use-auth-session.ts"
import { useStore } from "@/features/stores/hooks"
import { useCategories } from "@/features/categories/hooks"
import { ProductImageCell } from "@/components/ProductImageCell"
import { formatInventoryItemLabel, getPriceCurrency } from "@/features/products/utils"

type PopulatedStoreItem = {
  item_id: {
    _id: string
    name: string
    category?: string | { name: string } | null
    price?: { amount: number; currency: string }
    prices?: Array<{ amount?: number; currency?: string }>
    image?: string | null
  }
  quantity: number
  price: number
  _id?: string
}

function getTotalValue(items: PopulatedStoreItem[]) {
  return items.reduce((sum, item) => sum + item.quantity * item.price, 0)
}

function getTotalItems(items: PopulatedStoreItem[]) {
  return items.reduce((sum, item) => sum + item.quantity, 0)
}

export function MyStorePage() {
  const { data: session } = useAuthSession()
  const storeId = session?.store
  const { data: store, isLoading } = useStore(storeId || "")
  const { data: categories } = useCategories()

  const categoryMap = useMemo(() => {
    const map = new Map<string, string>()
    categories?.forEach((c) => map.set(c._id, c.name))
    return map
  }, [categories])

  const items = ((store?.items || []) as unknown as PopulatedStoreItem[])
    .filter((item) => item.quantity > 0 && item.item_id?._id)
    .sort((a, b) => (a.item_id?.name || "").localeCompare(b.item_id?.name || ""))

  const columns: ColumnDef<PopulatedStoreItem>[] = [
    {
      header: "Product",
      cell: (item) => (
        <div className="flex items-center gap-3">
          <ProductImageCell
            image={item.item_id?.image || undefined}
            altName={item.item_id?.name || "Product image"}
          />
          <span className="font-medium">
            {formatInventoryItemLabel(
              item.item_id?.name || "Unknown",
              item.price,
              item.item_id ? getPriceCurrency(item.item_id, item.price) : undefined
            )}
          </span>
        </div>
      ),
    },
    {
      header: "Category",
      cell: (item) => {
        const cat = item.item_id?.category
        if (!cat) return "—"
        if (typeof cat === "string") {
          return categoryMap.get(cat) || cat
        }
        return cat.name || "—"
      },
    },
    {
      header: "Quantity",
      cell: (item) => item.quantity,
      className: "w-[90px] text-right",
    },
    {
      header: "Unit Price",
      cell: (item) => item.price.toFixed(2),
      className: "w-[100px] text-right whitespace-nowrap",
    },
    {
      header: "Value",
      cell: (item) => (item.quantity * item.price).toFixed(2),
      className: "w-[100px] text-right whitespace-nowrap",
    },
  ]

  return (
    <div className="flex w-full flex-col gap-4">
      <div className="flex w-full flex-col sm:flex-row items-start justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-2xl font-bold">My Store</h1>
          <p className="text-sm text-gray-500">
            {store
              ? `${store.name} — ${store.address}`
              : storeId
                ? "Loading store..."
                : "No store assigned to your account."}
          </p>
        </div>
      </div>

      {store ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 shrink-0">
          <div className="rounded-lg border p-4">
            <p className="text-sm text-muted-foreground">Products</p>
            <p className="text-xl font-bold">{items.length}</p>
          </div>
          <div className="rounded-lg border p-4">
            <p className="text-sm text-muted-foreground">Total Items</p>
            <p className="text-xl font-bold">{getTotalItems(items)}</p>
          </div>
          <div className="rounded-lg border p-4">
            <p className="text-sm text-muted-foreground">Total Value</p>
            <p className="text-xl font-bold">{getTotalValue(items).toFixed(2)}</p>
          </div>
        </div>
      ) : null}

      <DataTable
        data={items}
        columns={columns}
        keyExtractor={(item) => item._id || item.item_id._id}
        loading={isLoading}
        emptyMessage="No products in stock."
      />
    </div>
  )
}
