import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Trash2 } from "lucide-react"
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
}

type StockFormState = {
  date: string
  items: StockItemForm[]
  description: string
  note: string
}

const emptyItem: StockItemForm = { item_id: "", quantity: "1" }

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
        }))
      : [{ ...emptyItem }],
    description: editing.description ?? "",
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
  form: StockFormState,
  userId: string,
  products: Product[] | undefined
): StockPayload {
  const rawItems = form.items.filter(
    (i) => i.item_id && Number(i.quantity) > 0
  )

  const items = rawItems.map((i) => {
    const price = getProductPrice(products, i.item_id) ?? 0
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
  const create = useCreateStock()
  const update = useUpdateStock()

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
      (i) => i.item_id && Number(i.quantity) > 0
    )
    if (validItems.length === 0) {
      setError("Please add at least one valid item.")
      return
    }

    // Validate that selected products have a price set by admin
    for (const item of validItems) {
      const price = getProductPrice(products, item.item_id)
      if (price === undefined || price === null) {
        const productName =
          products?.find((p) => p._id === item.item_id)?.name || item.item_id
        setError(
          `${productName} does not have a price set. Contact an admin to set the price before adding stock.`
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
            
            <div className="grid gap-3 px-1 text-xs font-medium text-muted-foreground hidden sm:grid grid-cols-[48px_1fr_100px_40px]">
              <div>Image</div>
              <div>Product</div>
              <div>Qty</div>
              <div></div>
            </div>

            <div className="flex flex-col gap-3">
              {form.items.map((item, index) => (
                <div
                  key={index}
                  className="grid grid-cols-1 gap-3 items-center border p-3 rounded-lg sm:border-0 sm:p-0 sm:rounded-none sm:grid-cols-[48px_1fr_100px_40px]"
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
                                <img src={p.image} alt="" className="h-6 w-6 rounded object-cover" />
                              ) : (
                                <div className="h-6 w-6 rounded bg-muted" />
                              )}
                              <span>{p.name}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-1">
                    <span className="text-xs font-medium text-muted-foreground sm:hidden">Qty</span>
                    <Input
                      type="number"
                      min="0"
                      placeholder="0"
                      value={item.quantity}
                      onChange={(e) =>
                        setItemField(index, "quantity", e.target.value)
                      }
                    />
                  </div>

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
