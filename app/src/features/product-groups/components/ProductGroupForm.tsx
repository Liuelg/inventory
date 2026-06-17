import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Trash2, ImagePlus, X } from "lucide-react"
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
import { useSubCategoriesByCategory } from "@/features/sub-categories/hooks"
import { useCreateProductGroup, useUpdateProductGroup } from "../hooks"
import type { ProductGroup, ProductGroupPayload } from "../types"

interface ProductGroupFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  editing?: ProductGroup | null
  onSuccess?: () => void
}

type GroupItemForm = {
  _key: string
  name: string
  quantity: string
  image: string
}

type ProductGroupFormState = {
  name: string
  category: string
  subCategory: string
  image: string
  items: GroupItemForm[]
}

let keyCounter = 0
function nextKey(): string {
  return `row-${++keyCounter}`
}

function createEmptyItem(): GroupItemForm {
  return { _key: nextKey(), name: "", quantity: "1", image: "" }
}

const initialState: ProductGroupFormState = {
  name: "",
  category: "",
  subCategory: "",
  image: "",
  items: [createEmptyItem()],
}

function getId(value: string | { _id: string } | undefined | null): string {
  if (!value) return ""
  if (typeof value === "string") return value
  return value._id ?? ""
}

function getProductImage(
  product: string | { _id: string; image?: string } | undefined | null
): string {
  if (!product) return ""
  if (typeof product === "string") return ""
  return product.image ?? ""
}

function getInitialState(editing?: ProductGroup | null): ProductGroupFormState {
  if (!editing) {
    return { ...initialState, items: [createEmptyItem()] }
  }

  return {
    name: editing.name ?? "",
    category: getId(editing.category),
    subCategory: getId(editing.subCategory),
    image: editing.image ?? "",
    items: editing.items.length
      ? editing.items.map((i) => ({
          _key: nextKey(),
          name: typeof i.product === "object" ? i.product.name ?? "" : "",
          quantity: String(i.quantity),
          image: getProductImage(i.product),
        }))
      : [createEmptyItem()],
  }
}

function toPayload(form: ProductGroupFormState): ProductGroupPayload {
  return {
    name: form.name.trim(),
    category: form.category.trim() || undefined,
    subCategory: form.subCategory.trim() || undefined,
    image: form.image.trim() || undefined,
    items: form.items
      .filter((i) => i.name.trim() && Number(i.quantity) > 0)
      .map((i) => ({
        name: i.name.trim(),
        quantity: Number(i.quantity),
        image: i.image.trim() || undefined,
      })),
  }
}

export function ProductGroupForm({
  open,
  onOpenChange,
  editing,
  onSuccess,
}: ProductGroupFormProps) {
  const [form, setForm] = useState<ProductGroupFormState>(() =>
    getInitialState(editing)
  )
  const [error, setError] = useState<string | null>(null)
  const { data: categories } = useCategories()
  const { data: subCategories } = useSubCategoriesByCategory(form.category)
  const create = useCreateProductGroup()
  const update = useUpdateProductGroup()

  const prevEditingRef = useRef<string | null>(null)
  const editingId = editing?._id ?? null
  if (prevEditingRef.current !== editingId) {
    prevEditingRef.current = editingId
    if (open) {
      setForm(getInitialState(editing))
      setError(null)
    }
  }

  function setField<Key extends keyof ProductGroupFormState>(
    key: Key,
    value: ProductGroupFormState[Key]
  ) {
    setForm((prev) => {
      const next = { ...prev, [key]: value }
      if (key === "category") {
        next.subCategory = ""
      }
      return next
    })
  }

  function setItemField(
    rowKey: string,
    key: keyof Omit<GroupItemForm, "_key" | "image">,
    value: string
  ) {
    setForm((prev) => {
      const items = prev.items.map((item) =>
        item._key === rowKey ? { ...item, [key]: value } : item
      )
      return { ...prev, items }
    })
  }

  function setItemImage(rowKey: string, image: string) {
    setForm((prev) => {
      const items = prev.items.map((item) =>
        item._key === rowKey ? { ...item, image } : item
      )
      return { ...prev, items }
    })
  }

  function addItem() {
    setForm((prev) => ({
      ...prev,
      items: [...prev.items, createEmptyItem()],
    }))
  }

  function removeItem(rowKey: string) {
    setForm((prev) => {
      if (prev.items.length <= 1) return prev
      const items = prev.items.filter((item) => item._key !== rowKey)
      return { ...prev, items }
    })
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!form.name.trim()) {
      setError("Group name is required.")
      return
    }

    const validItems = form.items.filter(
      (i) => i.name.trim() && Number(i.quantity) > 0
    )
    if (validItems.length === 0) {
      setError("Please add at least one valid product.")
      return
    }

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
      <DialogContent className="max-h-[90vh] overflow-auto sm:max-w-[600px] md:max-w-[700px] w-full">
        <DialogHeader>
          <DialogTitle>
            {editing ? "Edit Product Group" : "Add Product Group"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5 w-full mt-2">
          {error ? (
            <p className="text-destructive text-sm font-medium" role="alert">
              {error}
            </p>
          ) : null}

          <div className="grid gap-2">
            <Label htmlFor="group-name">Name</Label>
            <Input
              id="group-name"
              placeholder="Group name"
              value={form.name}
              onChange={(e) => setField("name", e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
          </div>

          <div className="grid gap-2">
            <Label>Group Image</Label>
            <div className="flex items-center gap-3">
              {form.image ? (
                <div className="relative">
                  <img
                    src={form.image}
                    alt="Preview"
                    className="h-20 w-20 rounded-md object-cover border"
                  />
                  <button
                    type="button"
                    onClick={() => setField("image", "")}
                    className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ) : null}
              <label className="flex cursor-pointer items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm hover:bg-accent">
                <ImagePlus className="h-4 w-4" />
                {form.image ? "Change Image" : "Upload Image"}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (!file) return
                    if (file.size > 2 * 1024 * 1024) {
                      setError("Image must be smaller than 2MB")
                      return
                    }
                    const reader = new FileReader()
                    reader.onloadend = () => {
                      setField("image", reader.result as string)
                    }
                    reader.readAsDataURL(file)
                  }}
                />
              </label>
            </div>
          </div>

          <div className="space-y-3">
            <Label className="font-semibold text-sm block border-b pb-1.5">Products</Label>

            <div className="flex flex-col gap-3">
              {form.items.map((item) => (
                <div
                  key={item._key}
                  className="grid grid-cols-1 sm:grid-cols-[1fr_100px_40px] gap-3 items-start border p-3 rounded-lg"
                >
                  {/* Product name + image */}
                  <div className="grid gap-2">
                    <div className="grid gap-1">
                      <Label className="text-xs text-muted-foreground">Product Name</Label>
                      <Input
                        type="text"
                        placeholder="Enter product name"
                        value={item.name}
                        onChange={(e) => setItemField(item._key, "name", e.target.value)}
                      />
                    </div>

                    <div className="grid gap-1">
                      <Label className="text-xs text-muted-foreground">Product Image</Label>
                      <div className="flex items-center gap-3">
                        {item.image ? (
                          <div className="relative">
                            <img
                              src={item.image}
                              alt="Preview"
                              className="h-14 w-14 rounded-md object-cover border"
                            />
                            <button
                              type="button"
                              onClick={() => setItemImage(item._key, "")}
                              className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ) : null}
                        <label className="flex cursor-pointer items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm hover:bg-accent">
                          <ImagePlus className="h-4 w-4" />
                          {item.image ? "Change" : "Upload"}
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0]
                              if (!file) return
                              if (file.size > 2 * 1024 * 1024) {
                                setError("Image must be smaller than 2MB")
                                return
                              }
                              const reader = new FileReader()
                              reader.onloadend = () => {
                                setItemImage(item._key, reader.result as string)
                              }
                              reader.readAsDataURL(file)
                            }}
                          />
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Quantity */}
                  <div className="grid gap-1">
                    <Label className="text-xs text-muted-foreground">Qty</Label>
                    <Input
                      type="number"
                      min="1"
                      placeholder="1"
                      value={item.quantity}
                      onChange={(e) =>
                        setItemField(item._key, "quantity", e.target.value)
                      }
                    />
                  </div>

                  {/* Remove */}
                  <div className="flex justify-end pt-6">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 text-muted-foreground hover:text-destructive"
                      onClick={() => removeItem(item._key)}
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
              + Add Product
            </Button>
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
              {editing ? "Update" : "Create"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
