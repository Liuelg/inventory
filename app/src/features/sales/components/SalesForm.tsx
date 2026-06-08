import { useState, useMemo } from "react"
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
import { useAuthSession } from "@/hooks/use-auth-session.ts"
import { useProducts } from "@/features/products/hooks"
import { getProductImageUrl } from "@/features/products/utils"
import { useStore } from "@/features/stores/hooks"
import { useCreateSale, useUpdateSale } from "../hooks"
import type { Sale, SalePayload } from "../types"

interface SalesFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  editing?: Sale | null
  onSuccess?: () => void
}

type SaleItemForm = {
  item_id: string
  quantity: string
}

type SaleFormState = {
  customerName: string
  items: SaleItemForm[]
}

const emptyItem: SaleItemForm = { item_id: "", quantity: "1" }

const initialState: SaleFormState = {
  customerName: "",
  items: [{ ...emptyItem }],
}

function getInitialState(editing?: Sale | null): SaleFormState {
  if (!editing) return { ...initialState }
  return {
    customerName: editing.customerName ?? "",
    items: editing.items.length
      ? editing.items.map((i) => ({
          item_id: i.item_id,
          quantity: String(i.quantity),
        }))
      : [{ ...emptyItem }],
  }
}

function getProductPrice(
  products: { _id: string; price?: { amount?: number } }[] | undefined,
  itemId: string
): number {
  return products?.find((p) => p._id === itemId)?.price?.amount ?? 0
}

function getProductImage(
  products: { _id: string; image?: string }[] | undefined,
  itemId: string
): string | undefined {
  return products?.find((p) => p._id === itemId)?.image
}

function toPayload(
  form: SaleFormState,
  userId: string,
  products: { _id: string; price?: { amount?: number } }[] | undefined
): SalePayload {
  const items = form.items
    .filter((i) => i.item_id && Number(i.quantity) > 0)
    .map((i) => ({
      item_id: i.item_id,
      quantity: Number(i.quantity),
      price: getProductPrice(products, i.item_id),
    }))

  const totalAmount = items.reduce(
    (sum, i) => sum + i.quantity * i.price,
    0
  )

  return {
    customerName: form.customerName.trim() || undefined,
    processedBy: userId,
    items,
    totalAmount,
    date_time: new Date().toISOString(),
  }
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
    return new Set(editing?.items.map((i) => i.item_id) || [])
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
      const price = getProductPrice(products, item.item_id)
      return sum + qty * price
    }, 0)
  }, [form.items, products])

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

    // Validate that selected products have a price set and enough stock
    for (const item of validItems) {
      const price = getProductPrice(products, item.item_id)
      if (!price) {
        const productName =
          products?.find((p) => p._id === item.item_id)?.name || item.item_id
        setError(
          `${productName} does not have a price set. Contact an admin to set the price before recording a sale.`
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

    const userId = session?.id
    if (!userId) {
      setError("You must be logged in.")
      return
    }

    const payload = toPayload(form, userId, products)
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
              className="grid grid-cols-[48px_1fr_90px_36px] gap-3 items-center"
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
                <Select
                  value={item.item_id}
                  onValueChange={(v) => setItemField(index, "item_id", v)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select product" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableProducts.map((p) => {
                      const available = storeItemsMap.get(p._id) || 0
                      return (
                        <SelectItem key={p._id} value={p._id} textValue={p.name}>
                          <div className="flex items-center gap-2">
                            {p.image ? (
                              <img src={getProductImageUrl(p.image)} alt="" className="h-6 w-6 rounded object-cover" />
                            ) : (
                              <div className="h-6 w-6 rounded bg-muted" />
                            )}
                            <span>{p.name}</span>
                            <span className="text-muted-foreground ml-1 text-xs">
                              ({available} in stock)
                            </span>
                          </div>
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
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
