import { useState, useRef, useMemo, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Trash2, Search, Check } from "lucide-react"
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

import { useAuthSession } from "@/hooks/use-auth-session.ts"
import { useProducts } from "@/features/products/hooks"
import { getProductImageUrl, formatProductLabel, getProductPrices } from "@/features/products/utils"
import type { Product } from "@/features/products/types"
import { useCreateStock, useStocks, useUpdateStock } from "../hooks"
import type { Stock, StockPayload, StockItem } from "../types"

interface StockFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  editing?: Stock | null
  onSuccess?: () => void
}

type StockItemForm = {
  _key: string
  item_id: string
  quantity: string
  price: string
  group?: string | null
}

type StockFormState = {
  date: string
  items: StockItemForm[]
  description: string
  note: string
}

let keyCounter = 0
function nextKey(): string {
  return `row-${++keyCounter}`
}

function createEmptyItem(): StockItemForm {
  return { _key: nextKey(), item_id: "", quantity: "1", price: "", group: null }
}

const initialState: StockFormState = {
  date: new Date().toISOString().slice(0, 10),
  items: [createEmptyItem()],
  description: "",
  note: "",
}

function getInitialState(editing?: Stock | null): StockFormState {
  if (!editing) return { ...initialState, items: [createEmptyItem()] }
  return {
    date: editing.date
      ? new Date(editing.date).toISOString().slice(0, 10)
      : new Date().toISOString().slice(0, 10),
    items: editing.items.length
      ? editing.items.map((i) => ({
          _key: nextKey(),
          item_id:
            typeof i.item_id === "string" ? i.item_id : i.item_id?._id ?? "",
          quantity: String(i.quantity),
          price: String(i.price ?? ""),
        }))
      : [createEmptyItem()],
    description: editing.description ?? "",
    note: editing.note ?? "",
  }
}

function getProductImage(
  products: Product[] | undefined,
  itemId: string
): string | undefined {
  const product = products?.find((p) => p._id === itemId)
  return product?.image
}

function mergeDuplicateItems(
  items: { item_id: string; quantity: number; price: number; group?: string | null }[]
): { item_id: string; quantity: number; price: number; group?: string | null }[] {
  const map = new Map<string, { item_id: string; quantity: number; price: number; group?: string | null }>()
  for (const item of items) {
    const key = `${item.item_id}-${item.price}`
    const existing = map.get(key)
    if (existing) {
      existing.quantity += item.quantity
    } else {
      map.set(key, { ...item })
    }
  }
  return Array.from(map.values())
}

function toPayload(
  form: StockFormState,
  userId: string,
): StockPayload {
  const rawItems = form.items.filter(
    (i) => i.item_id && Number(i.quantity) > 0
  )

  const items = mergeDuplicateItems(
    rawItems.map((i) => ({
      item_id: i.item_id,
      quantity: Number(i.quantity),
      price: Number(i.price) || 0,
      group: i.group || null,
    }))
  )

  const totalAmount = items.reduce(
    (sum, i) => sum + i.quantity * i.price,
    0
  )

  return {
    created_by: userId,
    date: new Date(form.date).toISOString(),
    items,
    totalAmount,
    note: form.note.trim() || undefined,
  }
}

function getItemIdString(item: StockItem): string {
  if (typeof item.item_id === "string") return item.item_id
  return item.item_id?._id ?? ""
}

function getGroupId(
  group: StockItem["group"]
): string | null {
  if (!group) return null
  if (typeof group === "string") return group
  return group._id ?? null
}

type DropdownItem = { type: "product"; id: string; name: string; image?: string; price?: Product["price"] }

function ProductSearchSelect({
  products,
  value,
  onChange,
}: {
  products: Product[]
  value: string
  onChange: (id: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const containerRef = useRef<HTMLDivElement>(null)

  const selectedProduct = products.find((p) => p._id === value)

  const allItems: DropdownItem[] = useMemo(() => {
    return products.map((p) => ({
      type: "product" as const,
      id: p._id,
      name: p.name,
      image: p.image,
      price: p.price,
    }))
  }, [products])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return allItems
    return allItems.filter((p) => p.name.toLowerCase().includes(q))
  }, [allItems, query])

  useEffect(() => {
    function handleDocClick(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleDocClick)
    return () => document.removeEventListener("mousedown", handleDocClick)
  }, [])

  const selectedLabel = selectedProduct ? formatProductLabel(selectedProduct) : (value ? "" : "Select product")
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
              <img src={getProductImageUrl(selectedImage)} alt="" className="h-5 w-5 rounded object-cover shrink-0" />
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
              placeholder="Search products or groups..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="h-8 border-0 bg-transparent shadow-none focus-visible:ring-0 px-0"
              autoFocus
            />
          </div>
          <div className="max-h-60 overflow-auto py-1">
            {filtered.length === 0 ? (
              <p className="px-3 py-2 text-sm text-muted-foreground">No items found.</p>
            ) : (
              filtered.map((item) => {
                const isSelected = item.id === value
                return (
                  <button
                    key={item.id}
                    type="button"
                    className={`flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground ${
                      isSelected ? "bg-accent text-accent-foreground" : ""
                    }`}
                    onClick={() => {
                      onChange(item.id)
                      setOpen(false)
                      setQuery("")
                    }}
                  >
                    {item.image ? (
                      <img src={getProductImageUrl(item.image)} alt="" className="h-6 w-6 rounded object-cover shrink-0" />
                    ) : (
                      <div className="h-6 w-6 rounded bg-muted shrink-0" />
                    )}
                    <span className="flex-1 truncate text-left">{formatProductLabel(item)}</span>
                    {isSelected ? <Check className="h-4 w-4 shrink-0" /> : null}
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

export function StockForm({
  open,
  onOpenChange,
  editing,
  onSuccess,
}: StockFormProps) {
  const [form, setForm] = useState<StockFormState>(() =>
    getInitialState(editing)
  )
  const [error, setError] = useState<string | null>(null)
  const [bulkQty, setBulkQty] = useState<string>("1")
  const { data: session } = useAuthSession()
  const { data: products } = useProducts()
  const { data: existingStocks } = useStocks()
  const create = useCreateStock()
  const update = useUpdateStock()
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Reset form when dialog opens/closes or editing changes
  const prevEditingRef = useRef<string | null>(null)
  const editingId = editing?._id ?? null
  if (prevEditingRef.current !== editingId) {
    prevEditingRef.current = editingId
    if (open) {
      setForm(getInitialState(editing))
      setError(null)
    }
  }

  function setField<Key extends keyof StockFormState>(
    key: Key,
    value: StockFormState[Key]
  ) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function setItemField(
    rowKey: string,
    key: keyof Omit<StockItemForm, "_key">,
    value: string
  ) {
    setForm((prev) => {
      const items = prev.items.map((item) =>
        item._key === rowKey ? { ...item, [key]: value } : item
      )
      return { ...prev, items }
    })
  }

  function handleProductSelect(rowKey: string, productId: string) {
    if (!productId) {
      setItemField(rowKey, "item_id", productId)
      return
    }

    setForm((prev) => {
      const currentRow = prev.items.find((i) => i._key === rowKey)
      if (!currentRow) return prev

      const product = products?.find((p) => p._id === productId)
      const defaultPrice = getProductPrices(product ?? { price: undefined, prices: undefined })[0]?.amount ?? ""

      const existingRow = prev.items.find(
        (i) => i._key !== rowKey && i.item_id === productId && i.price === String(defaultPrice)
      )

      if (existingRow) {
        const mergedQty =
          (Number(existingRow.quantity) || 0) +
          (Number(currentRow.quantity) || 0)

        const newItems = prev.items
          .map((item) =>
            item._key === existingRow._key
              ? { ...item, quantity: String(mergedQty) }
              : item
          )
          .filter((item) => item._key !== rowKey)

        if (newItems.length === 0) {
          newItems.push(createEmptyItem())
        }

        return { ...prev, items: newItems }
      }

      const items = prev.items.map((item) =>
        item._key === rowKey ? { ...item, item_id: productId, price: String(defaultPrice) } : item
      )
      return { ...prev, items }
    })
  }

  function addItem() {
    setForm((prev) => ({
      ...prev,
      items: [...prev.items, createEmptyItem()],
    }))
  }

  function addAllProducts() {
    console.log("Add All Products clicked. products:", products)
    if (!products || products.length === 0) {
      console.warn("No products available to add.")
      setError("No products available. Please make sure products are loaded.")
      return
    }
    const qtyNum = Number(bulkQty) > 0 ? Number(bulkQty) : 1
    const qtyStr = String(qtyNum)
    setForm((prev) => {
      const newItems = [...prev.items.filter((i) => i.item_id)]
      const itemMap = new Map<string, StockItemForm>()
      for (const item of newItems) {
        const key = `${item.item_id}-${item.price}`
        itemMap.set(key, item)
      }

      let addedCount = 0
      let incrementedCount = 0
      for (const product of products) {
        const defaultPrice = getProductPrices(product)[0]?.amount ?? ""
        const key = `${product._id}-${defaultPrice}`
        const existing = itemMap.get(key)
        if (existing) {
          existing.quantity = String(Number(existing.quantity) + qtyNum)
          incrementedCount++
        } else {
          newItems.push({
            _key: nextKey(),
            item_id: product._id,
            quantity: qtyStr,
            price: String(defaultPrice),
            group: null,
          })
          itemMap.set(key, newItems[newItems.length - 1])
          addedCount++
        }
      }

      console.log(`Added ${addedCount} new products, incremented ${incrementedCount} existing. Total items: ${newItems.length}`)

      if (newItems.length === 0) {
        newItems.push(createEmptyItem())
      }

      return { ...prev, items: newItems }
    })
  }

  function removeItem(rowKey: string) {
    setForm((prev) => {
      if (prev.items.length <= 1) return prev
      const items = prev.items.filter((item) => item._key !== rowKey)
      return { ...prev, items }
    })
  }

  async function handleCreateWithDedup(userId: string) {
    if (!existingStocks || existingStocks.length === 0) {
      // No existing stock at all — just create
      const payload = toPayload(form, userId)
      await create.mutateAsync(payload)
      return
    }

    // First, dedup items within the form itself
    const formItems = mergeDuplicateItems(
      form.items
        .filter((i) => i.item_id && Number(i.quantity) > 0)
        .map((i) => ({
          item_id: i.item_id,
          quantity: Number(i.quantity),
          price: Number(i.price) || 0,
          group: i.group || null,
        }))
    )

    // For each item, check if it already exists in stock
    const itemsToCreate: { item_id: string; quantity: number; price: number; group?: string | null }[] = []
    const updatesByStockId = new Map<
      string,
      { stock: Stock; itemUpdates: Map<string, number>; itemGroups?: Map<string, string | null> }
    >()

    for (const incoming of formItems) {
      // Find which existing stock entry contains this product
      const existingStock = existingStocks.find((stock) =>
        stock.items.some(
          (item) => getItemIdString(item) === incoming.item_id
        )
      )

      if (existingStock) {
        const entry = updatesByStockId.get(existingStock._id)
        if (entry) {
          entry.itemUpdates.set(
            incoming.item_id,
            (entry.itemUpdates.get(incoming.item_id) ?? 0) + incoming.quantity
          )
          // Track group per item_id (use first group's id if multiple)
          if (!entry.itemGroups) entry.itemGroups = new Map()
          if (incoming.group && !entry.itemGroups.has(incoming.item_id)) {
            entry.itemGroups.set(incoming.item_id, incoming.group)
          }
        } else {
          const map = new Map<string, number>()
          map.set(incoming.item_id, incoming.quantity)
          const groups = new Map<string, string | null>()
          if (incoming.group) groups.set(incoming.item_id, incoming.group)
          updatesByStockId.set(existingStock._id, {
            stock: existingStock,
            itemUpdates: map,
            itemGroups: groups,
          })
        }
      } else {
        itemsToCreate.push(incoming)
      }
    }

    // Update existing stock entries
    for (const [, { stock, itemUpdates, itemGroups }] of updatesByStockId) {
      const updatedItems = stock.items.map((item) => {
        const itemId = getItemIdString(item)
        const additionalQty = itemUpdates.get(itemId) ?? 0
        const groupId = itemGroups?.get(itemId) ?? null
        if (additionalQty > 0) {
          return {
            item_id: itemId,
            quantity: item.quantity + additionalQty,
            remaining: item.remaining + additionalQty,
            price: item.price,
            group: groupId ?? getGroupId((item as StockItem).group),
          }
        }
        return {
          item_id: itemId,
          quantity: item.quantity,
          remaining: item.remaining,
          price: item.price,
          group: getGroupId((item as StockItem).group),
        }
      })

      // Also add any brand-new items that weren't in this stock entry
      for (const [itemId, additionalQty] of itemUpdates) {
        const formItem = form.items.find((i) => i.item_id === itemId)
        const price = Number(formItem?.price) || 0
        const alreadyInStock = stock.items.some(
          (item) => getItemIdString(item) === itemId && item.price === price
        )
        if (!alreadyInStock) {
          const groupId = itemGroups?.get(itemId) ?? null
          updatedItems.push({
            item_id: itemId,
            quantity: additionalQty,
            remaining: additionalQty,
            price,
            group: groupId,
          })
        }
      }

      const totalAmount = updatedItems.reduce(
        (sum, i) => sum + i.quantity * i.price,
        0
      )

      await update.mutateAsync({
        id: stock._id,
        payload: {
          items: updatedItems,
          totalAmount,
          date: new Date(form.date).toISOString(),
        },
      })
    }

    // Create individual stock entry for each brand-new product
    if (itemsToCreate.length > 0) {
      await Promise.all(
        itemsToCreate.map((item) =>
          create.mutateAsync({
            created_by: userId,
            date: new Date(form.date).toISOString(),
            items: [item],
            totalAmount: item.quantity * item.price,
            note: form.note.trim() || undefined,
          })
        )
      )
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const validItems = form.items.filter(
      (i) => i.item_id && Number(i.quantity) > 0
    )
    if (validItems.length === 0) {
      setError("Please add at least one valid item.")
      return
    }

    const userId = session?.id
    if (!userId) {
      setError("You must be logged in.")
      return
    }

    setIsSubmitting(true)

    try {
      if (editing) {
        const payload = toPayload(form, userId)
        await update.mutateAsync(
          { id: editing._id, payload },
        )
      } else {
        await handleCreateWithDedup(userId)
      }
      onSuccess?.()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Something went wrong"
      setError(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const pending = isSubmitting || create.isPending || update.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-auto sm:max-w-[600px] md:max-w-[700px] w-full">
        <DialogHeader>
          <DialogTitle>
            {editing ? "Edit Stock Entry" : "Add Stock Entry"}
          </DialogTitle>
          <DialogDescription>
            {editing
              ? "Update the stock entry details."
              : "Record products received from the workshop."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5 w-full mt-2">
          {error ? (
            <p className="text-destructive text-sm font-medium" role="alert">
              {error}
            </p>
          ) : null}

          <div className="grid gap-2 max-w-[240px]">
            <Label htmlFor="stock-date" className="font-semibold">Date</Label>
            <Input
              id="stock-date"
              type="date"
              value={form.date}
              onChange={(e) => setField("date", e.target.value)}
            />
          </div>

          <div className="space-y-3">
            <Label className="font-semibold text-sm block border-b pb-1.5">Items</Label>
            
            <div className="grid gap-3 px-1 text-xs font-medium text-muted-foreground hidden sm:grid grid-cols-[48px_1fr_120px_100px_40px]">
              <div>Image</div>
              <div>Product</div>
              <div>Price</div>
              <div>Qty</div>
              <div></div>
            </div>

            <div className="flex flex-col gap-3">
              {form.items.map((item) => {
                const product = products?.find((p) => p._id === item.item_id)
                const priceOptions = product ? getProductPrices(product) : []

                return (
                  <div
                    key={item._key}
                    className="grid grid-cols-1 gap-3 items-center border p-3 rounded-lg sm:border-0 sm:p-0 sm:rounded-none sm:grid-cols-[48px_1fr_120px_100px_40px]"
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
                      <span className="text-xs font-medium text-muted-foreground sm:hidden">Product</span>
                      <ProductSearchSelect
                        products={products ?? []}
                        value={item.item_id}
                        onChange={(v) => handleProductSelect(item._key, v)}
                      />
                    </div>

                    <div className="grid gap-1">
                      <span className="text-xs font-medium text-muted-foreground sm:hidden">Price</span>
                      {priceOptions.length > 1 ? (
                        <Select
                          value={item.price}
                          onValueChange={(v) => setItemField(item._key, "price", v)}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select price" />
                          </SelectTrigger>
                          <SelectContent>
                            {priceOptions.map((p, idx) => (
                              <SelectItem key={idx} value={String(p.amount)}>
                                {p.amount} {p.currency || ""}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="0.00"
                          value={item.price}
                          onChange={(e) =>
                            setItemField(item._key, "price", e.target.value)
                          }
                        />
                      )}
                    </div>

                    <div className="grid gap-1">
                      <label
                        htmlFor={`stock-qty-${item._key}`}
                        className="text-xs font-medium text-muted-foreground sm:hidden"
                      >
                        Qty
                      </label>
                      <Input
                        id={`stock-qty-${item._key}`}
                        name={`stock-qty-${item._key}`}
                        type="number"
                        min="0"
                        placeholder="0"
                        value={item.quantity}
                        onChange={(e) =>
                          setItemField(item._key, "quantity", e.target.value)
                        }
                      />
                    </div>

                    <div className="flex justify-end pt-3 sm:pt-0">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 text-muted-foreground hover:text-destructive"
                        onClick={() => removeItem(item._key)}
                        disabled={form.items.length <= 1}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="flex flex-wrap gap-2 mt-1 items-end">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addItem}
              >
                + Add Item
              </Button>
              <div className="flex items-center gap-2">
                <div className="grid gap-1">
                  <Label className="text-[10px] text-muted-foreground">Qty per product</Label>
                  <Input
                    type="number"
                    min="1"
                    value={bulkQty}
                    onChange={(e) => setBulkQty(e.target.value)}
                    className="h-8 w-20 text-sm"
                  />
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={addAllProducts}
                  disabled={!products || products.length === 0}
                  title={
                    !products
                      ? "Products are still loading..."
                      : products.length === 0
                      ? "No products found in the catalog."
                      : `Add all ${products.length} products with qty ${bulkQty || 1}`
                  }
                >
                  Add All Products
                  {products ? ` (${products.length})` : ""}
                </Button>
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 border-t pt-4">
            <div className="grid gap-2">
              <Label htmlFor="stock-description" className="font-semibold">Description</Label>
              <Input
                id="stock-description"
                placeholder="What this stock entry is about"
                value={form.description}
                onChange={(e) => setField("description", e.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="stock-note" className="font-semibold">Note</Label>
              <Input
                id="stock-note"
                placeholder="Optional notes or context"
                value={form.note}
                onChange={(e) => setField("note", e.target.value)}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t mt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {editing ? "Update" : "Create Entry"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
