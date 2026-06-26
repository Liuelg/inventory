import { useState, useMemo, useRef, useEffect } from "react"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Search, Check } from "lucide-react"
import { useAuthSession } from "@/hooks/use-auth-session.ts"
import { useProducts } from "@/features/products/hooks"
import { getProductImageUrl } from "@/features/products/utils"
import { useStore } from "@/features/stores/hooks"
import { useCreateSale, useUpdateSale } from "../hooks"
import type { Sale, SalePayload } from "../types"
import type { Product } from "@/features/products/types"

interface SalesFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  editing?: Sale | null
  onSuccess?: () => void
}

type SaleItemForm = {
  item_id: string
  quantity: string
  price: string
  currency: string
}

type SaleFormState = {
  customerName: string
  items: SaleItemForm[]
}

const emptyItem: SaleItemForm = { item_id: "", quantity: "1", price: "", currency: "USD" }

const initialState: SaleFormState = {
  customerName: "",
  items: [{ ...emptyItem }],
}

function getItemId(item_id: string | Product): string {
  return typeof item_id === "object" && item_id !== null ? item_id._id : item_id
}

function getInitialState(editing?: Sale | null): SaleFormState {
  if (!editing) return { ...initialState }
  return {
    customerName: editing.customerName ?? "",
    items: editing.items.length
      ? editing.items.map((i) => ({
          item_id: getItemId(i.item_id),
          quantity: String(i.quantity),
          price: String(i.price),
          currency: i.currency || "USD",
        }))
      : [{ ...emptyItem }],
  }
}

function getProductImage(
  products: { _id: string; image?: string }[] | undefined,
  itemId: string
): string | undefined {
  return products?.find((p) => p._id === itemId)?.image
}

function toPayload(form: SaleFormState): SalePayload {
  const items = form.items
    .filter((i) => i.item_id && Number(i.quantity) > 0)
    .map((i) => ({
      item_id: i.item_id,
      quantity: Number(i.quantity),
      price: Number(i.price) || 0,
      currency: i.currency || "USD",
    }))

  const totalAmount = items.reduce(
    (sum, i) => sum + i.quantity * i.price,
    0
  )

  return {
    customerName: form.customerName.trim() || undefined,
    items,
    totalAmount,
    date_time: new Date().toISOString(),
  }
}

function ProductSearchSelect({
  products,
  storeItemsMap,
  value,
  onChange,
}: {
  products: Product[]
  storeItemsMap: Map<string, number>
  value: string
  onChange: (id: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const containerRef = useRef<HTMLDivElement>(null)

  const selectedProduct = products.find((p) => p._id === value)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return products
    return products.filter((p) => p.name.toLowerCase().includes(q))
  }, [products, query])

  useEffect(() => {
    function handleDocClick(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleDocClick)
    return () => document.removeEventListener("mousedown", handleDocClick)
  }, [])

  const selectedLabel = selectedProduct?.name || (value ? "" : "Select product")
  const selectedImage = selectedProduct?.image

  return (
    <div ref={containerRef} className="relative">
      <Button
        type="button"
        variant="outline"
        className="w-full justify-start font-normal"
        onClick={() => {
          setOpen((v) => !v)
          if (!open) setQuery("")
        }}
      >
        {selectedProduct ? (
          <div className="flex items-center gap-2 overflow-hidden">
            {selectedImage ? (
              <img
                src={getProductImageUrl(selectedImage)}
                alt=""
                className="h-5 w-5 rounded object-cover shrink-0"
              />
            ) : (
              <div className="h-5 w-5 rounded bg-muted shrink-0" />
            )}
            <span className="truncate">{selectedLabel}</span>
          </div>
        ) : (
          <span className="text-muted-foreground">{selectedLabel}</span>
        )}
      </Button>

      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-md">
          <div className="flex items-center gap-2 border-b px-2 py-1.5">
            <Search className="h-4 w-4 text-muted-foreground shrink-0" />
            <Input
              type="text"
              placeholder="Search products..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="h-8 border-0 bg-transparent shadow-none focus-visible:ring-0 px-0"
              autoFocus
            />
          </div>
          <div className="max-h-60 overflow-auto py-1">
            {filtered.length === 0 ? (
              <p className="px-3 py-2 text-sm text-muted-foreground">
                No products found.
              </p>
            ) : (
              filtered.map((p) => {
                const isSelected = p._id === value
                const available = storeItemsMap.get(p._id) || 0
                return (
                  <button
                    key={p._id}
                    type="button"
                    className={`flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground ${
                      isSelected ? "bg-accent text-accent-foreground" : ""
                    }`}
                    onClick={() => {
                      onChange(p._id)
                      setOpen(false)
                      setQuery("")
                    }}
                  >
                    {p.image ? (
                      <img
                        src={getProductImageUrl(p.image)}
                        alt=""
                        className="h-6 w-6 rounded object-cover shrink-0"
                      />
                    ) : (
                      <div className="h-6 w-6 rounded bg-muted shrink-0" />
                    )}
                    <span className="flex-1 truncate text-left">{p.name}</span>
                    <span className="text-muted-foreground text-xs shrink-0">
                      ({available} in stock)
                    </span>
                    {isSelected ? (
                      <Check className="h-4 w-4 shrink-0" />
                    ) : null}
                  </button>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export function SalesForm({
  open,
  onOpenChange,
  editing,
  onSuccess,
}: SalesFormProps) {
  const [form, setForm] = useState<SaleFormState>(() =>
    getInitialState(editing)
  )
  const [error, setError] = useState<string | null>(null)
  const { data: session } = useAuthSession()
  const { data: products } = useProducts()
  const { data: userStore } = useStore(session?.store || "")
  const create = useCreateSale()
  const update = useUpdateSale()

  // Build map of available quantities from store inventory
  const storeItemsMap = useMemo(() => {
    const map = new Map<string, number>()
    const items = (userStore?.items || []) as Array<{
      item_id: string | { _id: string; name?: string }
      quantity: number
    }>
    for (const item of items) {
      const id =
        typeof item.item_id === "string"
          ? item.item_id
          : item.item_id?._id ?? ""
      if (id) {
        map.set(id, item.quantity)
      }
    }
    return map
  }, [userStore])

  // Track products already in the editing sale so they remain selectable
  const editingItemIds = useMemo(() => {
    return new Set(editing?.items.map((i) => getItemId(i.item_id)) || [])
  }, [editing])

  // Filter products to only those in store with stock > 0 (or already in sale)
  const availableProducts = useMemo(() => {
    return (
      products?.filter((p) => {
        const available = storeItemsMap.get(p._id)
        if (available !== undefined && available > 0) return true
        if (editingItemIds.has(p._id)) return true
        return false
      }) || []
    )
  }, [products, storeItemsMap, editingItemIds])

  const userStoreName = userStore?.name ?? session?.store ?? "Not assigned"

  const totalAmount = useMemo(() => {
    return form.items.reduce((sum, item) => {
      const qty = Number(item.quantity) || 0
      const price = Number(item.price) || 0
      return sum + qty * price
    }, 0)
  }, [form.items])

  function setField<Key extends keyof SaleFormState>(
    key: Key,
    value: SaleFormState[Key]
  ) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function setItemField(
    index: number,
    key: keyof SaleItemForm,
    value: string
  ) {
    setForm((prev) => {
      const items = [...prev.items]
      items[index] = { ...items[index], [key]: value }
      return { ...prev, items }
    })
  }

  function handleProductChange(index: number, productId: string) {
    const product = products?.find((p) => p._id === productId)
    const currency = product?.price?.currency || "USD"
    setForm((prev) => {
      const items = [...prev.items]
      items[index] = { ...items[index], item_id: productId, currency }
      return { ...prev, items }
    })
  }

  function addItem() {
    setForm((prev) => ({
      ...prev,
      items: [...prev.items, { ...emptyItem }],
    }))
  }

  function removeItem(index: number) {
    setForm((prev) => {
      if (prev.items.length <= 1) return prev
      const items = prev.items.filter((_, i) => i !== index)
      return { ...prev, items }
    })
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!session?.store) {
      setError("Your account is not assigned to a store. Contact an admin.")
      return
    }
    const validItems = form.items.filter(
      (i) => i.item_id && Number(i.quantity) > 0
    )
    if (validItems.length === 0) {
      setError("Please add at least one valid item.")
      return
    }

    // Validate that each item has a price entered and enough stock
    for (const item of validItems) {
      const price = Number(item.price)
      if (!price || price <= 0) {
        const productName =
          products?.find((p) => p._id === item.item_id)?.name || item.item_id
        setError(
          `${productName} does not have a valid price. Please enter a price.`
        )
        return
      }

      const available = storeItemsMap.get(item.item_id) || 0
      const requested = Number(item.quantity)
      if (requested > available) {
        const productName =
          products?.find((p) => p._id === item.item_id)?.name || item.item_id
        setError(
          `${productName}: requested ${requested} but only ${available} available in store.`
        )
        return
      }
    }

    if (!session?.id) {
      setError("You must be logged in.")
      return
    }

    const payload = toPayload(form)
    if (editing) {
      update.mutate(
        { id: editing._id, payload },
        {
          onSuccess: () => onSuccess?.(),
          onError: (err) => setError(err.message),
        }
      )
      return
    }

    create.mutate(payload, {
      onSuccess: () => onSuccess?.(),
      onError: (err) => setError(err.message),
    })
  }

  const isPending = create.isPending || update.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-auto w-full sm:max-w-[650px]">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit Sale" : "Add Sale"}</DialogTitle>
          <DialogDescription>
            {editing
              ? "Update the sale record."
              : "Record a new sale with items and invoice details."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {error ? (
            <p className="text-destructive text-sm" role="alert">
              {error}
            </p>
          ) : null}

          <div className="grid gap-2">
            <Label>Branch</Label>
            <div className="rounded-md border border-input bg-muted px-3 py-2 text-sm text-muted-foreground">
              {userStoreName}
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="sale-customer">Customer Name</Label>
            <Input
              id="sale-customer"
              placeholder="Customer name"
              value={form.customerName}
              onChange={(e) => setField("customerName", e.target.value)}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label>Items</Label>
            <span className="text-sm font-medium">
              Total: {totalAmount.toFixed(2)}
            </span>
          </div>

          {form.items.map((item, index) => (
            <div
              key={index}
              className="grid grid-cols-[48px_1fr_70px_55px_65px_36px] gap-3 items-center"
            >
              <div className="flex items-center justify-center">
                <div className="h-10 w-10 rounded-md border bg-muted overflow-hidden">
                  {item.item_id && getProductImage(products, item.item_id) ? (
                    <img
                      src={getProductImage(products, item.item_id)}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : null}
                </div>
              </div>
              <div className="grid gap-1">
                <Label className="text-xs">Product</Label>
                <ProductSearchSelect
                  products={availableProducts}
                  storeItemsMap={storeItemsMap}
                  value={item.item_id}
                  onChange={(v) => handleProductChange(index, v)}
                />
              </div>
              <div className="grid gap-1">
                <Label className="text-xs">
                  Qty
                  {item.item_id && (
                    <span className="text-muted-foreground ml-1">
                      (max:{storeItemsMap.get(item.item_id) ?? 0})
                    </span>
                  )}
                </Label>
                <Input
                  type="number"
                  min="1"
                  max={storeItemsMap.get(item.item_id) ?? undefined}
                  value={item.quantity}
                  onChange={(e) =>
                    setItemField(index, "quantity", e.target.value)
                  }
                />
              </div>
              <div className="grid gap-1">
                <Label className="text-xs">Price</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={item.price}
                  onChange={(e) =>
                    setItemField(index, "price", e.target.value)
                  }
                />
              </div>
              <div className="grid gap-1">
                <Label className="text-xs">Currency</Label>
                <Select
                  value={item.currency}
                  onValueChange={(v) => setItemField(index, "currency", v)}
                >
                  <SelectTrigger className="h-9 text-xs w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ETB">ETB</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => removeItem(index)}
                disabled={form.items.length <= 1}
              >
                <span className="text-destructive">×</span>
              </Button>
            </div>
          ))}

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addItem}
            disabled={availableProducts.length === 0}
          >
            + Add Item
          </Button>

          {availableProducts.length === 0 && !editing && (
            <p className="text-muted-foreground text-xs">
              No products available in store inventory.
            </p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {editing ? "Update" : "Create"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
