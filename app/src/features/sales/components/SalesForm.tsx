import { useState, useEffect, useMemo } from "react"
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
  price: string
}

type SaleFormState = {
  customerName: string
  invoiceNumber: string
  storeId: string
  items: SaleItemForm[]
}

const emptyItem: SaleItemForm = { item_id: "", quantity: "1", price: "" }

const initialState: SaleFormState = {
  customerName: "",
  invoiceNumber: "",
  storeId: "",
  items: [{ ...emptyItem }],
}

function getInitialState(editing?: Sale | null): SaleFormState {
  if (!editing) return { ...initialState }
  return {
    customerName: editing.customerName ?? "",
    invoiceNumber: editing.invoiceNumber ?? "",
    storeId: typeof editing.store === "string" ? editing.store : editing.store?._id ?? "",
    items: editing.items.length
      ? editing.items.map((i) => ({
          item_id: i.item_id,
          quantity: String(i.quantity),
          price: String(i.price),
        }))
      : [{ ...emptyItem }],
  }
}

function toPayload(form: SaleFormState, userId: string): SalePayload {
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
    customerName: form.customerName.trim() || undefined,
    invoiceNumber: form.invoiceNumber.trim(),
    store: form.storeId,
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
  const { data: stores } = useStores()
  const create = useCreateSale()
  const update = useUpdateSale()

  useEffect(() => {
    setForm(getInitialState(editing))
    setError(null)
  }, [editing, open])

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
    if (!form.invoiceNumber.trim()) {
      setError("Invoice number is required.")
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
          <DialogTitle>{editing ? "Edit Sale" : "Add Sale"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {error ? (
            <p className="text-destructive text-sm" role="alert">
              {error}
            </p>
          ) : null}

          <div className="grid gap-2">
            <Label htmlFor="sale-invoice">Invoice Number</Label>
            <Input
              id="sale-invoice"
              placeholder="INV-001"
              value={form.invoiceNumber}
              onChange={(e) => setField("invoiceNumber", e.target.value)}
            />
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

          <div className="flex items-center justify-between">
            <Label>Items</Label>
            <span className="text-sm font-medium">
              Total: {totalAmount.toFixed(2)}
            </span>
          </div>

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
