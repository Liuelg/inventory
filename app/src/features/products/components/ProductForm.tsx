import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useCreateProduct, useUpdateProduct } from "../hooks"
import type { Product, ProductPayload } from "../types"

interface ProductFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  editing?: Product | null
  onSuccess?: () => void
}

type ProductFormState = {
  name: string
  description: string
  category: string
  amount: string
  currency: string
  previousPrice: string
  tags: string
  image: string
}

const initialState: ProductFormState = {
  name: "",
  description: "",
  category: "",
  amount: "",
  currency: "USD",
  previousPrice: "",
  tags: "",
  image: "",
}

function getInitialState(editing?: Product | null): ProductFormState {
  if (!editing) {
    return initialState
  }

  return {
    name: editing.name ?? "",
    description: editing.description ?? "",
    category: editing.category ?? "",
    amount:
      editing.price?.amount !== undefined ? String(editing.price.amount) : "",
    currency: editing.price?.currency ?? "USD",
    previousPrice:
      editing.previous_prices !== undefined
        ? String(editing.previous_prices)
        : "",
    tags: editing.tags?.join(", ") ?? "",
    image: editing.image ?? "",
  }
}

function toPayload(form: ProductFormState): ProductPayload {
  const amount = form.amount.trim() ? Number(form.amount) : undefined
  const previousPrice = form.previousPrice.trim()
    ? Number(form.previousPrice)
    : undefined
  const tags = form.tags
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean)

  return {
    name: form.name.trim(),
    description: form.description.trim() || undefined,
    category: form.category.trim() || undefined,
    price:
      amount !== undefined || form.currency.trim()
        ? {
            amount,
            currency: form.currency.trim() || "USD",
          }
        : undefined,
    previous_prices: previousPrice,
    tags: tags.length ? tags : undefined,
    image: form.image.trim() || undefined,
  }
}

export function ProductForm({
  open,
  onOpenChange,
  editing,
  onSuccess,
}: ProductFormProps) {
  const [form, setForm] = useState<ProductFormState>(() =>
    getInitialState(editing)
  )
  const create = useCreateProduct()
  const update = useUpdateProduct()

  function setField<Key extends keyof ProductFormState>(
    key: Key,
    value: ProductFormState[Key]
  ) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) return

    const payload = toPayload(form)
    if (editing) {
      update.mutate(
        { id: editing._id, payload },
        { onSuccess: () => onSuccess?.() }
      )
      return
    }

    create.mutate(payload, { onSuccess: () => onSuccess?.() })
  }

  const isPending = create.isPending || update.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit Product" : "Add Product"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid gap-2">
            <Label htmlFor="product-name">Name</Label>
            <Input
              id="product-name"
              placeholder="Product name"
              value={form.name}
              onChange={(e) => setField("name", e.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="product-description">Description</Label>
            <Input
              id="product-description"
              placeholder="Product description"
              value={form.description}
              onChange={(e) => setField("description", e.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="product-category">Category</Label>
            <Input
              id="product-category"
              placeholder="Category name"
              value={form.category}
              onChange={(e) => setField("category", e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="product-amount">Price Amount</Label>
              <Input
                id="product-amount"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={form.amount}
                onChange={(e) => setField("amount", e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="product-currency">Currency</Label>
              <Input
                id="product-currency"
                placeholder="USD"
                value={form.currency}
                onChange={(e) => setField("currency", e.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="product-previous-price">Previous Price</Label>
            <Input
              id="product-previous-price"
              type="number"
              min="0"
              step="0.01"
              placeholder="Optional previous price"
              value={form.previousPrice}
              onChange={(e) => setField("previousPrice", e.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="product-tags">Tags</Label>
            <Input
              id="product-tags"
              placeholder="tag1, tag2, tag3"
              value={form.tags}
              onChange={(e) => setField("tags", e.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="product-image">Image URL</Label>
            <Input
              id="product-image"
              placeholder="https://..."
              value={form.image}
              onChange={(e) => setField("image", e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2">
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
