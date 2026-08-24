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
import { Trash2, Plus } from "lucide-react"

interface ProductFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  editing?: Product | null
  onSuccess?: () => void
}

type PriceRow = {
  amount: string
  currency: string
}

type ProductFormState = {
  name: string
  description: string
  category: string
  subCategory: string
  prices: PriceRow[]
  previousPrice: string
  tags: string
}

const emptyPriceRow: PriceRow = { amount: "", currency: "USD" }

const initialState: ProductFormState = {
  name: "",
  description: "",
  category: "",
  subCategory: "",
  prices: [{ ...emptyPriceRow }],
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

  const prices: PriceRow[] = []
  if (editing.price?.amount != null) {
    prices.push({
      amount: String(editing.price.amount),
      currency: editing.price.currency ?? "USD",
    })
  }
  if (editing.prices) {
    for (const p of editing.prices) {
      if (p.amount != null) {
        prices.push({
          amount: String(p.amount),
          currency: p.currency ?? "USD",
        })
      }
    }
  }
  if (prices.length === 0) {
    prices.push({ ...emptyPriceRow })
  }

  return {
    name: editing.name ?? "",
    description: editing.description ?? "",
    category: getId(editing.category),
    subCategory: getId(editing.subCategory),
    prices,
    previousPrice:
      editing.previous_prices !== undefined
        ? String(editing.previous_prices)
        : "",
    tags: editing.tags?.join(", ") ?? "",
  }
}

function toPayload(form: ProductFormState, isAdmin: boolean): ProductPayload {
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
    const validPrices = form.prices
      .map((p) => ({
        amount: p.amount.trim() ? Number(p.amount) : undefined,
        currency: p.currency.trim() || "USD",
      }))
      .filter((p) => p.amount !== undefined)

    if (validPrices.length > 0) {
      payload.price = {
        amount: validPrices[0].amount,
        currency: validPrices[0].currency,
      }
      if (validPrices.length > 1) {
        payload.prices = validPrices.slice(1)
      }
    }

    const previousPrice = form.previousPrice.trim()
      ? Number(form.previousPrice)
      : undefined
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

  function setPriceRow(index: number, key: keyof PriceRow, value: string) {
    setForm((prev) => {
      const prices = [...prev.prices]
      prices[index] = { ...prices[index], [key]: value }
      return { ...prev, prices }
    })
  }

  function addPriceRow() {
    setForm((prev) => ({
      ...prev,
      prices: [...prev.prices, { ...emptyPriceRow }],
    }))
  }

  function removePriceRow(index: number) {
    setForm((prev) => {
      if (prev.prices.length <= 1) return prev
      const prices = prev.prices.filter((_, i) => i !== index)
      return { ...prev, prices }
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
            <div className="grid gap-3">
              <Label className="font-semibold">Prices</Label>
              <div className="flex flex-col gap-2">
                {form.prices.map((row, index) => (
                  <div key={index} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-end">
                    <div className="grid gap-1">
                      <Label className="text-xs text-muted-foreground">Amount</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        value={row.amount}
                        onChange={(e) => setPriceRow(index, "amount", e.target.value)}
                      />
                    </div>
                    <div className="grid gap-1">
                      <Label className="text-xs text-muted-foreground">Currency</Label>
                      <select
                        value={row.currency}
                        onChange={(e) => setPriceRow(index, "currency", e.target.value)}
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      >
                        <option value="USD">USD</option>
                        <option value="ETB">ETB</option>
                        <option value="EUR">EUR</option>
                        <option value="GBP">GBP</option>
                      </select>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removePriceRow(index)}
                      disabled={form.prices.length <= 1}
                      className="h-9 w-9 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addPriceRow}
                  className="w-fit"
                >
                  <Plus className="mr-1 h-4 w-4" />
                  Add Price
                </Button>
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
