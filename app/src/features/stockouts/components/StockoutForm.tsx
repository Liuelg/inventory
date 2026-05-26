import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button.tsx"
import { Input } from "@/components/ui/input.tsx"
import { Label } from "@/components/ui/label.tsx"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.tsx"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx"
import { useAuthSession } from "@/hooks/use-auth-session.ts"
import { useProducts } from "@/features/products/hooks"
import { useStores } from "@/features/stores/hooks"
import { useAvailableStock } from "@/features/stock/hooks"
import { useCreateStockout, useUpdateStockout } from "../hooks"
import type { Stockout, StockoutPayload } from "../types"

interface StockoutFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  editing?: Stockout | null
  onSuccess?: () => void
}

type StockoutItemForm = {
  item_id: string
  quantity: string
  price: string
}

type StockoutFormState = {
  storeId: string
  items: StockoutItemForm[]
  note: string
}

const emptyItem: StockoutItemForm = { item_id: "", quantity: "1", price: "" }

const initialState: StockoutFormState = {
  storeId: "",
  items: [{ ...emptyItem }],
  note: "",
}

function getInitialState(editing?: Stockout | null): StockoutFormState {
  if (!editing) return { ...initialState }
  return {
    storeId: typeof editing.store === "string" ? editing.store : editing.store?._id ?? "",
    items: editing.items.length
      ? editing.items.map((i) => ({
          item_id: typeof i.item_id === "string" ? i.item_id : i.item_id._id,
          quantity: String(i.quantity),
          price: String(i.price),
        }))
      : [{ ...emptyItem }],
    note: editing.note ?? "",
  }
}

function toPayload(form: StockoutFormState, userId: string): StockoutPayload {
  const items = form.items
    .filter((i) => i.item_id && i.quantity && i.price)
    .map((i) => ({
      item_id: i.item_id,
      quantity: Number(i.quantity),
      price: Number(i.price),
    }))

  return {
    created_by: userId,
    store: form.storeId,
    items,
    date: new Date().toISOString(),
    note: form.note || undefined,
  }
}

export function StockoutForm({
  open,
  onOpenChange,
  editing,
  onSuccess,
}: StockoutFormProps) {
  const [form, setForm] = useState<StockoutFormState>(() =>
    getInitialState(editing)
  )
  const [error, setError] = useState<string | null>(null)
  const { data: session } = useAuthSession()
  const { data: products } = useProducts()
  const { data: stores } = useStores()
  const { data: availableStockData } = useAvailableStock()
  const create = useCreateStockout()
  const update = useUpdateStockout()

  // Compute available stock map, adding back editing quantities
  // so the user can re-allocate them
  const availableMap = (() => {
    const map = new Map(
      availableStockData?.data?.map((s) => [s.product._id, s.available]) || []
    )
    if (editing?.items) {
      for (const item of editing.items) {
        const productId = typeof item.item_id === "string" ? item.item_id : item.item_id._id
        const current = map.get(productId) || 0
        map.set(productId, current + item.quantity)
      }
    }
    return map
  })()

  useEffect(() => {
    setForm(getInitialState(editing))
    setError(null)
  }, [editing, open])

  function setField<Key extends keyof StockoutFormState>(
    key: Key,
    value: StockoutFormState[Key]
  ) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function setItemField(
    index: number,
    key: keyof StockoutItemForm,
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

    if (!form.storeId) {
      setError("Please select a store.")
      return
    }

    const validItems = form.items.filter(
      (i) => i.item_id && Number(i.quantity) > 0 && i.price
    )
    if (validItems.length === 0) {
      setError("Please add at least one valid item.")
      return
    }

    // Validate against available stock
    for (const item of validItems) {
      const available = availableMap.get(item.item_id) || 0
      const requested = Number(item.quantity)
      if (requested > available) {
        const productName = products?.find((p) => p._id === item.item_id)?.name || item.item_id
        setError(`${productName}: requested ${requested} but only ${available} available in stock.`)
        return
      }
    }

    const userId = session?.id
    if (!userId) {
      setError("You must be logged in.")
      return
    }

    // Only allow editing pending stockouts
    if (editing && editing.status !== "pending") {
      setError("Only pending stockouts can be edited.")
      return
    }

    const payload = toPayload(form, userId)
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
      <DialogContent className="max-h-[90vh] overflow-auto w-full sm:max-w-[800px]">
        <DialogHeader>
          <DialogTitle>
            {editing ? "Edit Stockout" : "Add Stockout"}
          </DialogTitle>
          <DialogDescription>
            {editing
              ? "Update the stockout details."
              : "Send stock items to a store."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {error ? (
            <p className="text-destructive text-sm" role="alert">
              {error}
            </p>
          ) : null}

          <div className="grid gap-2">
            <Label>Store</Label>
            <Select
              value={form.storeId}
              onValueChange={(v) => setField("storeId", v)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select store" />
              </SelectTrigger>
              <SelectContent>
                {stores?.map((s) => (
                  <SelectItem key={s._id} value={s._id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label>Note</Label>
            <Input
              type="text"
              placeholder="Optional note"
              value={form.note}
              onChange={(e) => setField("note", e.target.value)}
            />
          </div>

          <Label>Items</Label>

          {form.items.map((item, index) => (
            <div
              key={index}
              className="grid grid-cols-[auto_90px_90px_36px] gap-3 items-end"
            >
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
                    {products?.map((p) => {
                      const available = availableMap.get(p._id)
                      return (
                        <SelectItem key={p._id} value={p._id}>
                          {p.name}
                          {available !== undefined ? (
                            <span className="text-muted-foreground ml-1 text-xs">
                              ({available} in stock)
                            </span>
                          ) : null}
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
                      (max:{availableMap.get(item.item_id) ?? 0})
                    </span>
                  )}
                </Label>
                <Input
                  type="number"
                  min="1"
                  max={availableMap.get(item.item_id) ?? undefined}
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
          >
            + Add Item
          </Button>

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
