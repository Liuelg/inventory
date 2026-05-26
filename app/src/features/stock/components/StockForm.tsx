import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Trash2 } from "lucide-react" // Added for a cleaner delete icon if you use lucide-react
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
import type { Product } from "@/features/products/types"
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

function getProductPrice(products: Product[] | undefined, itemId: string): number | undefined {
  const product = products?.find((p) => p._id === itemId)
  return product?.price?.amount
}

function toPayload(
  form: StockFormState,
  userId: string,
  products: Product[] | undefined,
  isAdmin: boolean
): StockPayload {
  const rawItems = form.items.filter((i) => i.item_id && Number(i.quantity) > 0)

  const items = rawItems.map((i) => {
    const price = isAdmin
      ? Number(i.price)
      : getProductPrice(products, i.item_id) ?? 0
    return {
      item_id: i.item_id,
      quantity: Number(i.quantity),
      price,
    }
  })

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
  const isAdmin = session?.role === "admin"
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

    const validItems = form.items.filter((i) => {
      const hasProduct = i.item_id && Number(i.quantity) > 0
      if (!hasProduct) return false
      if (isAdmin) return !!i.price
      // Non-admin: price comes from product, just check product exists
      return true
    })
    if (validItems.length === 0) {
      setError("Please add at least one valid item.")
      return
    }

    // Non-admin: validate that selected products have a price set by admin
    if (!isAdmin) {
      for (const item of validItems) {
        const price = getProductPrice(products, item.item_id)
        if (price === undefined || price === null) {
          const productName = products?.find((p) => p._id === item.item_id)?.name || item.item_id
          setError(`${productName} does not have a price set. Contact an admin to set the price before adding stock.`)
          return
        }
      }
    }

    const userId = session?.id
    if (!userId) {
      setError("You must be logged in.")
      return
    }

    const payload = toPayload(form, userId, products, isAdmin)
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
      {/* CHANGED: Swapped w-fit max-w-[95vw] for explicit md widths so it spans out cleanly */}
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

        {/* CHANGED: Removed w-96 so the form scales up to match the widened dialog */}
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
            
            {/* CHANGED: Added a dedicated header line for the inputs so we don't repeat labels inside the map */}
            <div className={`grid gap-3 px-1 text-xs font-medium text-muted-foreground hidden sm:grid ${isAdmin ? "grid-cols-[1fr_100px_120px_40px]" : "grid-cols-[1fr_100px_40px]"}`}>
              <div>Product</div>
              <div>Qty</div>
              {isAdmin && <div>Price</div>}
              <div></div>
            </div>

            <div className="flex flex-col gap-3">
              {form.items.map((item, index) => (
                <div
                  key={index}
                  className={`grid grid-cols-1 gap-3 items-center border p-3 rounded-lg sm:border-0 sm:p-0 sm:rounded-none ${isAdmin ? "sm:grid-cols-[1fr_100px_120px_40px]" : "sm:grid-cols-[1fr_100px_40px]"}`}
                >
                  <div className="grid gap-1">
                    <span className="text-xs font-medium text-muted-foreground sm:hidden">Product</span>
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
                    <span className="text-xs font-medium text-muted-foreground sm:hidden">Qty</span>
                    <Input
                      type="number"
                      min="1"
                      placeholder="0"
                      value={item.quantity}
                      onChange={(e) =>
                        setItemField(index, "quantity", e.target.value)
                      }
                    />
                  </div>

                  {isAdmin && (
                    <div className="grid gap-1">
                      <span className="text-xs font-medium text-muted-foreground sm:hidden">Price</span>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        value={item.price}
                        onChange={(e) =>
                          setItemField(index, "price", e.target.value)
                        }
                      />
                    </div>
                  )}

                  <div className="flex justify-end pt-3 sm:pt-0">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 text-muted-foreground hover:text-destructive"
                      onClick={() => removeItem(index)}
                      disabled={form.items.length <= 1}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-1"
              onClick={addItem}
            >
              + Add Item
            </Button>
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
            <Button type="submit" disabled={isPending}>
              {editing ? "Update" : "Create Entry"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}