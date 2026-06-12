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
import { getProductImageUrl } from "@/features/products/utils"
import { useStores } from "@/features/stores/hooks"
import { useCreateStockout, useUpdateStockout } from "../hooks"
import type { Product } from "@/features/products/types"
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

function getProductPrice(
  products: Product[] | undefined,
  itemId: string
): number | undefined {
  const product = products?.find((p) => p._id === itemId)
  return product?.price?.amount
}

function getProductImage(
  products: Product[] | undefined,
  itemId: string
): string | undefined {
  const product = products?.find((p) => p._id === itemId)
  return product?.image
}

function toPayload(
  form: StockoutFormState,
  userId: string,
  products: Product[] | undefined
): StockoutPayload {
  const items = form.items
    .filter((i) => i.item_id && Number(i.quantity) > 0)
    .map((i) => ({
      item_id: i.item_id,
      quantity: Number(i.quantity),
      price: getProductPrice(products, i.item_id) ?? Number(i.price) ?? 0,
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
  const create = useCreateStockout()
  const update = useUpdateStockout()

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
      if (key === "item_id" && value) {
        const price = getProductPrice(products, value)
        items[index].price = price !== undefined ? String(price) : ""
      }
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
      (i) => i.item_id && Number(i.quantity) > 0
    )
    if (validItems.length === 0) {
      setError("Please add at least one valid item.")
      return
    }

    // Validate that selected products have a price set
    for (const item of validItems) {
      const price = getProductPrice(products, item.item_id)
      if (price === undefined || price === null) {
        const productName = products?.find((p) => p._id === item.item_id)?.name || item.item_id
        setError(
          `${productName} does not have a price set. Contact an admin to set the price.`
        )
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
              className="grid grid-cols-[48px_1fr_90px_40px] gap-3 items-center"
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
                    {products?.map((p) => (
                      <SelectItem key={p._id} value={p._id} textValue={p.name}>
                        <div className="flex items-center gap-2">
                          {p.image ? (
                            <img src={getProductImageUrl(p.image)} alt="" className="h-6 w-6 rounded object-cover" />
                          ) : (
                            <div className="h-6 w-6 rounded bg-muted" />
                          )}
                          <span>{p.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {item.item_id && (
                  <span className="text-xs text-muted-foreground">
                    Price: {getProductPrice(products, item.item_id)?.toFixed(2) ?? "—"}
                  </span>
                )}
              </div>
              <div className="grid gap-1">
                <Label className="text-xs">Qty</Label>
                <Input
                  type="number"
                  min="1"
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
