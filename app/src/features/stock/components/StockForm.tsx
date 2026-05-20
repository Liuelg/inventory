import { useState, useEffect } from "react"
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
import { useCreateStock, useUpdateStock } from "../hooks"
import type { Stock, StockPayload } from "../types"

interface StockFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  editing?: Stock | null
  onSuccess?: () => void
}

type StockItemForm = {
  item_id: string
  quantity: string
  price: string
}

type StockFormState = {
  date: string
  items: StockItemForm[]
  description: string
  note: string
}

const emptyItem: StockItemForm = { item_id: "", quantity: "1", price: "" }

const initialState: StockFormState = {
  date: new Date().toISOString().slice(0, 10),
  items: [{ ...emptyItem }],
  description: "",
  note: "",
}

function getInitialState(editing?: Stock | null): StockFormState {
  if (!editing) return { ...initialState }
  return {
    date: editing.date
      ? new Date(editing.date).toISOString().slice(0, 10)
      : new Date().toISOString().slice(0, 10),
    items: editing.items.length
      ? editing.items.map((i) => ({
          item_id:
            typeof i.item_id === "string" ? i.item_id : i.item_id?._id ?? "",
          quantity: String(i.quantity),
          price: String(i.price),
        }))
      : [{ ...emptyItem }],
    description: editing.description ?? "",
    note: editing.note ?? "",
  }
}

function toPayload(form: StockFormState, userId: string): StockPayload {
  const items = form.items
    .filter((i) => i.item_id && i.quantity && i.price)
    .map((i) => ({
      item_id: i.item_id,
      quantity: Number(i.quantity),
      price: Number(i.price),
    }))

  const totalAmount = items.reduce(
    (sum, i) => sum + i.quantity * i.price,
    0
  )

  return {
    created_by: userId,
    date: new Date(form.date).toISOString(),
    items,
    totalAmount,
    description: form.description.trim() || undefined,
    note: form.note.trim() || undefined,
  }
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
  const { data: session } = useAuthSession()
  const { data: products } = useProducts()
  const create = useCreateStock()
  const update = useUpdateStock()

  useEffect(() => {
    setForm(getInitialState(editing))
    setError(null)
  }, [editing, open])

  function setField<Key extends keyof StockFormState>(
    key: Key,
    value: StockFormState[Key]
  ) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function setItemField(
    index: number,
    key: keyof StockItemForm,
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
            {editing ? "Edit Stock Entry" : "Add Stock Entry"}
          </DialogTitle>
          <DialogDescription>
            {editing
              ? "Update the stock entry details."
              : "Record products received from the workshop."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {error ? (
            <p className="text-destructive text-sm" role="alert">
              {error}
            </p>
          ) : null}

          <div className="grid gap-2">
            <Label htmlFor="stock-date">Date</Label>
            <Input
              id="stock-date"
              type="date"
              value={form.date}
              onChange={(e) => setField("date", e.target.value)}
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

          <div className="grid gap-2">
            <Label htmlFor="stock-description">Description</Label>
            <Input
              id="stock-description"
              placeholder="What this stock entry is about"
              value={form.description}
              onChange={(e) => setField("description", e.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="stock-note">Note</Label>
            <Input
              id="stock-note"
              placeholder="Optional note"
              value={form.note}
              onChange={(e) => setField("note", e.target.value)}
            />
          </div>

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
