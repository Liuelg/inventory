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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useCategories } from "@/features/categories/hooks"
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
  const [error, setError] = useState<string | null>(null)
  const { data: categories } = useCategories()
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
    setError(null)
    if (!form.name.trim()) return

    const payload = toPayload(form)
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
      <DialogContent className="max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit Product" : "Add Product"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {error ? (
            <p className="text-destructive text-sm" role="alert">
              {error}
            </p>
          ) : null}
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
            <Label>Category</Label>
            <Select
              value={form.category}
              onValueChange={(v) => setField("category", v)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {categories?.map((c) => (
                  <SelectItem key={c._id} value={c.name}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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

              <select
                id="product-currency"
                value={form.currency}
                onChange={(e) => setField("currency", e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">Select currency</option>
                <option value="USD">USD</option>
                <option value="ETB">ETB</option>
              </select>
            </div>
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
