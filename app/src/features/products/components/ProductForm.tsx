import { useEffect, useState } from "react"
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
import { useAuthSession } from "@/hooks/use-auth-session"
import { useCategories } from "@/features/categories/hooks"
import { useSubCategoriesByCategory } from "@/features/sub-categories/hooks"
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
  subCategory: string
  amount: string
  currency: string
  previousPrice: string
  tags: string
}

const initialState: ProductFormState = {
  name: "",
  description: "",
  category: "",
  subCategory: "",
  amount: "",
  currency: "USD",
  previousPrice: "",
  tags: "",
}

function getId(value: string | { _id: string } | undefined | null): string {
  if (!value) return ""
  if (typeof value === "string") return value
  return value._id ?? ""
}

function getInitialState(editing?: Product | null): ProductFormState {
  if (!editing) {
    return initialState
  }

  return {
    name: editing.name ?? "",
    description: editing.description ?? "",
    category: getId(editing.category),
    subCategory: getId(editing.subCategory),
    amount:
      editing.price?.amount !== undefined ? String(editing.price.amount) : "",
    currency: editing.price?.currency ?? "USD",
    previousPrice:
      editing.previous_prices !== undefined
        ? String(editing.previous_prices)
        : "",
    tags: editing.tags?.join(", ") ?? "",
  }
}

function toPayload(form: ProductFormState, isAdmin: boolean): ProductPayload {
  const amount = form.amount.trim() ? Number(form.amount) : undefined
  const previousPrice = form.previousPrice.trim()
    ? Number(form.previousPrice)
    : undefined
  const tags = form.tags
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean)

  const payload: ProductPayload = {
    name: form.name.trim(),
    description: form.description.trim() || undefined,
    category: form.category.trim() || undefined,
    subCategory: form.subCategory.trim() || undefined,
    tags: tags.length ? tags : undefined,
  }

  if (isAdmin) {
    if (amount !== undefined || form.currency.trim()) {
      payload.price = {
        amount,
        currency: form.currency.trim() || "USD",
      }
    }
    if (previousPrice !== undefined) {
      payload.previous_prices = previousPrice
    }
  }

  return payload
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
  const { data: subCategories } = useSubCategoriesByCategory(form.category)
  const { data: session } = useAuthSession()
  const isAdmin = session?.role === "admin"
  const create = useCreateProduct()
  const update = useUpdateProduct()

  useEffect(() => {
    if (open) {
      setForm(getInitialState(editing))
      setError(null)
    }
  }, [open, editing])

  function setField<Key extends keyof ProductFormState>(
    key: Key,
    value: ProductFormState[Key]
  ) {
    setForm((prev) => {
      const next = { ...prev, [key]: value }
      if (key === "category") {
        next.subCategory = ""
      }
      return next
    })
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!form.name.trim()) return

    const payload = toPayload(form, isAdmin)

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
                  <SelectItem key={c._id} value={c._id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label>Sub Category</Label>
            <Select
              value={form.subCategory}
              onValueChange={(v) => setField("subCategory", v)}
              disabled={!form.category}
            >
              <SelectTrigger className="w-full">
                <SelectValue
                  placeholder={
                    form.category
                      ? "Select sub category"
                      : "Select a category first"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {subCategories?.map((sc) => (
                  <SelectItem key={sc._id} value={sc._id}>
                    {sc.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {isAdmin && (
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
          )}

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
