import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
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
import { useStores } from "@/features/stores/hooks"
import { useCreateGoodIn, useUpdateGoodIn } from "../hooks"
import type { GoodIn, GoodInPayload } from "../types"

interface GoodInFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  editing?: GoodIn | null
  onSuccess?: () => void
}

type GoodInItemForm = {
  item_id: string
  quantity: string
  price: string
}

type GoodInFormState = {
  storeId: string
  items: GoodInItemForm[]
  is_accepted: boolean
}

const emptyItem: GoodInItemForm = { item_id: "", quantity: "1", price: "" }

const initialState: GoodInFormState = {
  storeId: "",
  items: [{ ...emptyItem }],
  is_accepted: false,
}

function getInitialState(editing?: GoodIn | null): GoodInFormState {
  if (!editing) return { ...initialState }
  return {
    storeId: typeof editing.store === "string" ? editing.store : editing.store?._id ?? "",
    items: editing.items.length
      ? editing.items.map((i) => ({
          item_id: i.item_id,
          quantity: String(i.quantity),
          price: String(i.price),
        }))
      : [{ ...emptyItem }],
    is_accepted: editing.is_accepted ?? false,
  }
}

function toPayload(form: GoodInFormState, userId: string): GoodInPayload {
  const items = form.items
    .filter((i) => i.item_id && i.quantity && i.price)
    .map((i) => ({
      item_id: i.item_id,
      quantity: Number(i.quantity),
      price: Number(i.price),
    }))

  return {
    created_by: userId,
    user: userId,
    store: form.storeId,
    items,
    date: new Date().toISOString(),
    is_accepted: form.is_accepted,
    accepted_at: form.is_accepted ? new Date().toISOString() : null,
  }
}

export function GoodInForm({
  open,
  onOpenChange,
  editing,
  onSuccess,
}: GoodInFormProps) {
  const [form, setForm] = useState<GoodInFormState>(() =>
    getInitialState(editing)
  )
  const [error, setError] = useState<string | null>(null)
  const { data: session } = useAuthSession()
  const { data: products } = useProducts()
  const { data: stores } = useStores()
  const create = useCreateGoodIn()
  const update = useUpdateGoodIn()

  useEffect(() => {
    setForm(getInitialState(editing))
    setError(null)
  }, [editing, open])

  function setField<Key extends keyof GoodInFormState>(
    key: Key,
    value: GoodInFormState[Key]
  ) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function setItemField(
    index: number,
    key: keyof GoodInItemForm,
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

    const userId = session?.id
    if (!userId) {
      setError("You must be logged in.")
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
      <DialogContent className="max-h-[90vh] overflow-auto w-fit max-w-[95vw]">
        <DialogHeader>
          <DialogTitle>
            {editing ? "Edit Stock In" : "Add Stock In"}
          </DialogTitle>
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
              value={form.storeId || undefined}
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

          <div className="flex items-center gap-2">
            <input
              id="goodin-accepted"
              type="checkbox"
              checked={form.is_accepted}
              onChange={(e) => setField("is_accepted", e.target.checked)}
              className="h-4 w-4 rounded border-border"
            />
            <Label htmlFor="goodin-accepted" className="cursor-pointer">
              Accepted
            </Label>
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
                  value={item.item_id || undefined}
                  onValueChange={(v) => setItemField(index, "item_id", v)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select product" />
                  </SelectTrigger>
                  <SelectContent>
                    {products?.map((p) => (
                      <SelectItem key={p._id} value={p._id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
