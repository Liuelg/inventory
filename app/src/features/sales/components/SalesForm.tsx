import { useState, useMemo, useRef, useEffect } from "react"
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
import { Search, Check, ImagePlus, X } from "lucide-react"
import { useAuthSession } from "@/hooks/use-auth-session.ts"
import { useProducts } from "@/features/products/hooks"
import { getProductImageUrl, getPriceCurrency } from "@/features/products/utils"
import { useStore, useStores } from "@/features/stores/hooks"
import { useCreateSale, useUpdateSale } from "../hooks"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { Sale, SalePayload } from "../types"
import type { Product } from "@/features/products/types"

interface SalesFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  editing?: Sale | null
  onSuccess?: () => void
}

type SaleItemForm = {
  item_id: string
  quantity: string
  eur: string
  usd: string
  birr: string
  visa: string
  gbp: string
  storePrice: string
  image: string
  imageFile: File | null
  previewUrl?: string
}

type SaleFormState = {
  customerName: string
  date: string
  items: SaleItemForm[]
}

const emptyItem: SaleItemForm = {
  item_id: "",
  quantity: "1",
  eur: "",
  usd: "",
  birr: "",
  visa: "",
  gbp: "",
  storePrice: "",
  image: "",
  imageFile: null,
}

const initialState: SaleFormState = {
  customerName: "",
  date: "",
  items: [{ ...emptyItem }],
}

function getItemId(item_id: string | Product): string {
  return typeof item_id === "object" && item_id !== null ? item_id._id : item_id
}

function migrateOldPrice(item: Sale["items"][number]): Omit<SaleItemForm, "item_id" | "quantity" | "image" | "imageFile"> {
  const storePrice = item.price ? String(item.price) : ""
  // New format: item already has eur/usd/birr/visa/gbp
  if (
    "eur" in item ||
    "usd" in item ||
    "birr" in item ||
    "visa" in item ||
    "gbp" in item
  ) {
    return {
      storePrice,
      eur: item.eur ? String(item.eur) : "",
      usd: item.usd ? String(item.usd) : "",
      birr: item.birr ? String(item.birr) : "",
      visa: item.visa ? String(item.visa) : "",
      gbp: item.gbp ? String(item.gbp) : "",
    }
  }
  // Old format: item has price + currency — map to the right field
  const price = (item as unknown as { price?: number }).price ?? 0
  const currency = (item as unknown as { currency?: string }).currency || "USD"
  if (currency === "ETB") {
    return { storePrice, eur: "", usd: "", birr: String(price), visa: "", gbp: "" }
  }
  if (currency === "EUR") {
    return { storePrice, eur: String(price), usd: "", birr: "", visa: "", gbp: "" }
  }
  return { storePrice, eur: "", usd: String(price), birr: "", visa: "", gbp: "" }
}

function formatDateInputValue(isoDate: string): string {
  const d = new Date(isoDate)
  const year = d.getUTCFullYear()
  const month = String(d.getUTCMonth() + 1).padStart(2, "0")
  const day = String(d.getUTCDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function getInitialState(editing?: Sale | null): SaleFormState {
  if (!editing) return { ...initialState }
  return {
    customerName: editing.customerName ?? "",
    date: editing.date_time ? formatDateInputValue(editing.date_time) : "",
    items: editing.items.length
      ? editing.items.map((i) => ({
          item_id: getItemId(i.item_id),
          quantity: String(i.quantity),
          image: i.image || "",
          imageFile: null,
          ...migrateOldPrice(i),
        }))
      : [{ ...emptyItem }],
  }
}

function toPayload(
  form: SaleFormState,
  editing?: Sale | null,
  storeId?: string
): SalePayload {
  const items = form.items
    .filter((i) => i.item_id && Number(i.quantity) > 0)
    .map((i) => ({
      item_id: i.item_id,
      quantity: Number(i.quantity),
      eur: Number(i.eur) || 0,
      usd: Number(i.usd) || 0,
      birr: Number(i.birr) || 0,
      visa: Number(i.visa) || 0,
      gbp: Number(i.gbp) || 0,
      price: i.storePrice ? Number(i.storePrice) : undefined,
      image: i.image || "",
    }))

  const totalAmount = items.reduce(
    (sum, i) => sum + (i.eur + i.usd + i.birr + i.visa + i.gbp),
    0
  )

  const payload: SalePayload = {
    customerName: form.customerName.trim() || undefined,
    items,
    totalAmount,
  }

  if (!editing) {
    // New sale: store the exact current time
    payload.date_time = new Date().toISOString()
    if (storeId) {
      payload.store = storeId
    }
  } else if (form.date) {
    // Editing: use the selected date but preserve the original time component
    const [year, month, day] = form.date.split("-").map(Number)
    const original = editing.date_time ? new Date(editing.date_time) : null
    const now = new Date()
    payload.date_time = new Date(Date.UTC(
      year,
      month - 1,
      day,
      original ? original.getUTCHours() : now.getUTCHours(),
      original ? original.getUTCMinutes() : now.getUTCMinutes(),
      original ? original.getUTCSeconds() : now.getUTCSeconds()
    )).toISOString()
  }

  return payload
}

type StoreVariant = {
  key: string
  productId: string
  name: string
  image?: string
  price: number
  currency?: string
  quantity: number
}

function VariantSearchSelect({
  variants,
  value,
  onChange,
}: {
  variants: StoreVariant[]
  value: string
  onChange: (key: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const containerRef = useRef<HTMLDivElement>(null)

  const selectedVariant = variants.find((v) => v.key === value)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return variants
    return variants.filter((v) => v.name.toLowerCase().includes(q))
  }, [variants, query])

  useEffect(() => {
    function handleDocClick(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleDocClick)
    return () => document.removeEventListener("mousedown", handleDocClick)
  }, [])

  const selectedLabel = selectedVariant
    ? `${selectedVariant.name} (${selectedVariant.price}${selectedVariant.currency ? " " + selectedVariant.currency : ""})`
    : value
      ? "Select product"
      : "Select product"
  const selectedImage = selectedVariant?.image

  return (
    <div ref={containerRef} className="relative">
      <Button
        type="button"
        variant="outline"
        className="w-full justify-start font-normal"
        onClick={() => {
          setOpen((v) => !v)
          if (!open) setQuery("")
        }}
      >
        {selectedVariant ? (
          <div className="flex items-center gap-2 overflow-hidden">
            {selectedImage ? (
              <img
                src={getProductImageUrl(selectedImage)}
                alt=""
                className="h-5 w-5 rounded object-cover shrink-0"
              />
            ) : (
              <div className="h-5 w-5 rounded bg-muted shrink-0" />
            )}
            <span className="truncate">{selectedLabel}</span>
          </div>
        ) : (
          <span className="text-muted-foreground">{selectedLabel}</span>
        )}
      </Button>

      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-md">
          <div className="flex items-center gap-2 border-b px-2 py-1.5">
            <Search className="h-4 w-4 text-muted-foreground shrink-0" />
            <Input
              type="text"
              placeholder="Search products..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="h-8 border-0 bg-transparent shadow-none focus-visible:ring-0 px-0"
              autoFocus
            />
          </div>
          <div className="max-h-60 overflow-auto py-1">
            {filtered.length === 0 ? (
              <p className="px-3 py-2 text-sm text-muted-foreground">
                No products found.
              </p>
            ) : (
              filtered.map((v) => {
                const isSelected = v.key === value
                return (
                  <button
                    key={v.key}
                    type="button"
                    className={`flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground ${
                      isSelected ? "bg-accent text-accent-foreground" : ""
                    }`}
                    onClick={() => {
                      onChange(v.key)
                      setOpen(false)
                      setQuery("")
                    }}
                  >
                    {v.image ? (
                      <img
                        src={getProductImageUrl(v.image)}
                        alt=""
                        className="h-6 w-6 rounded object-cover shrink-0"
                      />
                    ) : (
                      <div className="h-6 w-6 rounded bg-muted shrink-0" />
                    )}
                    <span className="flex-1 truncate text-left">
                      {v.name} ({v.price}{v.currency ? " " + v.currency : ""})
                    </span>
                    <span className="text-muted-foreground text-xs shrink-0">
                      ({v.quantity} in stock)
                    </span>
                    {isSelected ? (
                      <Check className="h-4 w-4 shrink-0" />
                    ) : null}
                  </button>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
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
  const [selectedStoreId, setSelectedStoreId] = useState<string>("")
  const { data: session } = useAuthSession()
  const { data: products } = useProducts()
  const { data: allStores } = useStores()

  const isAdmin = session?.role === "admin"

  // Determine which store's inventory to use
  const editingStoreId = editing
    ? typeof editing.store === "string"
      ? editing.store
      : editing.store?._id ?? ""
    : ""

  const activeStoreId = editing
    ? editingStoreId
    : isAdmin
      ? selectedStoreId
      : session?.store || ""

  const { data: activeStore } = useStore(activeStoreId)
  const create = useCreateSale()
  const update = useUpdateSale()
  const formRef = useRef(form)

  useEffect(() => {
    formRef.current = form
  })

  // Clean up object URLs on unmount
  useEffect(() => {
    return () => {
      formRef.current.items.forEach((item) => {
        if (item.previewUrl) {
          URL.revokeObjectURL(item.previewUrl)
        }
      })
    }
  }, [])

  // Build flattened list of store variants for the dropdown
  const storeVariants = useMemo(() => {
    if (!products) return []
    const variantMap = new Map<string, StoreVariant>()

    const items = (activeStore?.items || []) as Array<{
      item_id: string | { _id: string; name?: string }
      quantity: number
      price?: number
    }>

    for (const item of items) {
      const productId =
        typeof item.item_id === "string"
          ? item.item_id
          : item.item_id?._id ?? ""
      if (!productId || item.quantity <= 0) continue
      const product = products.find((p) => p._id === productId)
      if (!product) continue

      const price = item.price ?? 0
      const key = `${productId}|${price}`
      variantMap.set(key, {
        key,
        productId,
        name: product.name,
        image: product.image,
        price,
        currency: getPriceCurrency(product, price),
        quantity: item.quantity,
      })
    }

    // For editing: ensure sale items' variants remain selectable
    if (editing) {
      for (const saleItem of editing.items) {
        const productId = getItemId(saleItem.item_id)
        const product = products.find((p) => p._id === productId)
        if (!product) continue
        const price = saleItem.price ?? 0
        const key = `${productId}|${price}`
        if (!variantMap.has(key)) {
          variantMap.set(key, {
            key,
            productId,
            name: product.name,
            image: product.image,
            price,
            currency: getPriceCurrency(product, price),
            quantity: 0,
          })
        }
      }
    }

    return Array.from(variantMap.values()).sort(
      (a, b) => a.name.localeCompare(b.name) || a.price - b.price
    )
  }, [products, activeStore, editing])

  // Build a quick lookup map for validation
  const variantByKey = useMemo(() => {
    const map = new Map<string, StoreVariant>()
    for (const v of storeVariants) {
      map.set(v.key, v)
    }
    return map
  }, [storeVariants])

  const activeStoreName = activeStore?.name ?? activeStoreId ?? "Not assigned"

  function setField<Key extends keyof SaleFormState>(
    key: Key,
    value: SaleFormState[Key]
  ) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function setItemField(
    index: number,
    key: keyof SaleItemForm,
    value: string | File | null
  ) {
    setForm((prev) => {
      const items = [...prev.items]
      items[index] = { ...items[index], [key]: value }
      return { ...prev, items }
    })
  }

  function handleVariantChange(index: number, variantKey: string) {
    const [productId, price] = variantKey.split("|")
    setForm((prev) => {
      const items = [...prev.items]
      items[index] = {
        ...items[index],
        item_id: productId || "",
        storePrice: price || "",
      }
      return { ...prev, items }
    })
  }

  function handleImageChange(index: number, file: File | null) {
    setForm((prev) => {
      const items = [...prev.items]
      const prevItem = items[index]
      if (prevItem.previewUrl) {
        URL.revokeObjectURL(prevItem.previewUrl)
      }
      items[index] = {
        ...prevItem,
        imageFile: file,
        image: file ? "" : prevItem.image,
        previewUrl: file ? URL.createObjectURL(file) : undefined,
      }
      return { ...prev, items }
    })
  }

  function clearImage(index: number) {
    setForm((prev) => {
      const items = [...prev.items]
      const prevItem = items[index]
      if (prevItem.previewUrl) {
        URL.revokeObjectURL(prevItem.previewUrl)
      }
      items[index] = {
        ...prevItem,
        imageFile: null,
        image: "",
        previewUrl: undefined,
      }
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
      const item = prev.items[index]
      if (item.previewUrl) {
        URL.revokeObjectURL(item.previewUrl)
      }
      const items = prev.items.filter((_, i) => i !== index)
      return { ...prev, items }
    })
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    // Creating a sale always requires a store; editing relies on the sale's own store
    if (!editing && !activeStoreId) {
      setError(
        isAdmin
          ? "Please select a store."
          : "Your account is not assigned to a store. Contact an admin."
      )
      return
    }
    const validItems = form.items.filter(
      (i) => i.item_id && Number(i.quantity) > 0
    )
    if (validItems.length === 0) {
      setError("Please add at least one valid item.")
      return
    }

    // Validate that at least one price field is filled per item
    for (const item of validItems) {
      const hasPrice =
        Number(item.eur) > 0 ||
        Number(item.usd) > 0 ||
        Number(item.birr) > 0 ||
        Number(item.visa) > 0 ||
        Number(item.gbp) > 0
      if (!hasPrice) {
        const productName =
          products?.find((p) => p._id === item.item_id)?.name || item.item_id
        setError(
          `${productName}: at least one of the five price fields (EUR, USD, BIRR, VISA, GBP) must be filled.`
        )
        return
      }
    }

    // Validate stock availability (skip for admins when editing — backend handles it)
    if (!isAdmin || !editing) {
      for (const item of validItems) {
        const key = `${item.item_id}|${item.storePrice}`
        const variant = variantByKey.get(key)
        const available = variant?.quantity ?? 0
        const requested = Number(item.quantity)
        if (requested > available) {
          const productName = variant?.name || item.item_id
          setError(
            `${productName}: requested ${requested} but only ${available} available in store.`
          )
          return
        }
      }
    }

    if (!session?.id) {
      setError("You must be logged in.")
      return
    }

    const payload = toPayload(form, editing, isAdmin ? selectedStoreId : undefined)
    const fd = new FormData()
    fd.append("data", JSON.stringify(payload))

    form.items.forEach((item, index) => {
      if (item.imageFile) {
        fd.append(`image_${index}`, item.imageFile)
      }
    })

    if (editing) {
      update.mutate(
        { id: editing._id, payload: fd },
        {
          onSuccess: () => onSuccess?.(),
          onError: (err) => setError(err.message),
        }
      )
      return
    }

    create.mutate(fd, {
      onSuccess: () => onSuccess?.(),
      onError: (err) => setError(err.message),
    })
  }

  const isPending = create.isPending || update.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-auto w-full sm:max-w-[900px]">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit Sale" : "Add Sale"}</DialogTitle>
          <DialogDescription>
            {editing
              ? "Update the sale record."
              : "Record a new sale with items and invoice details."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {error ? (
            <p className="text-destructive text-sm" role="alert">
              {error}
            </p>
          ) : null}

          <div className="grid gap-2">
            <Label>Branch</Label>
            {editing ? (
              <div className="rounded-md border border-input bg-muted px-3 py-2 text-sm text-muted-foreground">
                {activeStoreName}
              </div>
            ) : isAdmin ? (
              <Select
                value={selectedStoreId}
                onValueChange={setSelectedStoreId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a store" />
                </SelectTrigger>
                <SelectContent>
                  {allStores?.map((s) => (
                    <SelectItem key={s._id} value={s._id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="rounded-md border border-input bg-muted px-3 py-2 text-sm text-muted-foreground">
                {activeStoreName}
              </div>
            )}
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

          {editing && (
            <div className="grid gap-2">
              <Label htmlFor="sale-date">Sale Date</Label>
              <Input
                id="sale-date"
                type="date"
                value={form.date}
                onChange={(e) => setField("date", e.target.value)}
              />
            </div>
          )}

          <Label>Items</Label>

          {form.items.map((item, index) => {
            const preview =
              item.previewUrl ||
              (item.image ? getProductImageUrl(item.image) : undefined)

            const photoTrigger = preview ? (
              <div className="relative h-9 w-9 shrink-0 rounded-md border overflow-hidden">
                <img
                  src={preview}
                  alt=""
                  className="h-full w-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => clearImage(index)}
                  className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-destructive-foreground"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </div>
            ) : (
              <label className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-md border border-dashed border-muted-foreground/40 hover:border-muted-foreground hover:bg-accent transition-colors">
                <ImagePlus className="h-4 w-4 text-muted-foreground/60" />
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null
                    if (file && file.size > 2 * 1024 * 1024) {
                      setError("Each image must be smaller than 2MB")
                      return
                    }
                    handleImageChange(index, file)
                  }}
                />
              </label>
            )

            const qtyInput = (
              <div className="grid gap-0.5">
                <Label className="text-[10px] leading-none">
                  Qty
                  {item.item_id && item.storePrice && (
                    <span className="text-muted-foreground ml-0.5">
                      /{variantByKey.get(`${item.item_id}|${item.storePrice}`)?.quantity ?? 0}
                    </span>
                  )}
                </Label>
                <Input
                  type="number"
                  min="1"
                  max={variantByKey.get(`${item.item_id}|${item.storePrice}`)?.quantity ?? undefined}
                  value={item.quantity}
                  onChange={(e) =>
                    setItemField(index, "quantity", e.target.value)
                  }
                  className="h-8 px-1.5 text-xs"
                />
              </div>
            )

            const eurInput = (
              <div className="grid gap-0.5">
                <Label className="text-[10px] leading-none">EUR</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0"
                  value={item.eur}
                  onChange={(e) =>
                    setItemField(index, "eur", e.target.value)
                  }
                  className="h-8 px-1.5 text-xs"
                />
              </div>
            )

            const usdInput = (
              <div className="grid gap-0.5">
                <Label className="text-[10px] leading-none">USD</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0"
                  value={item.usd}
                  onChange={(e) =>
                    setItemField(index, "usd", e.target.value)
                  }
                  className="h-8 px-1.5 text-xs"
                />
              </div>
            )

            const birrInput = (
              <div className="grid gap-0.5">
                <Label className="text-[10px] leading-none">BIRR</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0"
                  value={item.birr}
                  onChange={(e) =>
                    setItemField(index, "birr", e.target.value)
                  }
                  className="h-8 px-1.5 text-xs"
                />
              </div>
            )

            const visaInput = (
              <div className="grid gap-0.5">
                <Label className="text-[10px] leading-none">VISA</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0"
                  value={item.visa}
                  onChange={(e) =>
                    setItemField(index, "visa", e.target.value)
                  }
                  className="h-8 px-1.5 text-xs"
                />
              </div>
            )

            const gbpInput = (
              <div className="grid gap-0.5">
                <Label className="text-[10px] leading-none">GBP</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0"
                  value={item.gbp}
                  onChange={(e) =>
                    setItemField(index, "gbp", e.target.value)
                  }
                  className="h-8 px-1.5 text-xs"
                />
              </div>
            )

            return (
              <div key={index}>
                {/* Mobile layout */}
                <div className="sm:hidden flex flex-col gap-2 rounded-lg border p-3">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 min-w-0">
                      <Label className="text-xs">Product</Label>
                      <VariantSearchSelect
                        variants={storeVariants}
                        value={`${item.item_id}|${item.storePrice}`}
                        onChange={(v) => handleVariantChange(index, v)}
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => removeItem(index)}
                      disabled={form.items.length <= 1}
                      className="h-8 w-8 shrink-0"
                    >
                      <span className="text-destructive">×</span>
                    </Button>
                  </div>
                  <div className="flex items-end gap-1.5">
                    <div className="shrink-0">{photoTrigger}</div>
                    <div className="flex-1 min-w-0">{qtyInput}</div>
                    <div className="flex-1 min-w-0">{eurInput}</div>
                    <div className="flex-1 min-w-0">{usdInput}</div>
                    <div className="flex-1 min-w-0">{birrInput}</div>
                    <div className="flex-1 min-w-0">{visaInput}</div>
                    <div className="flex-1 min-w-0">{gbpInput}</div>
                  </div>
                </div>

                {/* Desktop layout */}
                <div className="hidden sm:grid sm:grid-cols-[40px_1fr_52px_56px_56px_56px_56px_56px_28px] sm:gap-2 sm:items-center">
                  <div className="flex items-center justify-center">
                    {photoTrigger}
                  </div>
                  <div className="grid gap-0.5 min-w-0">
                    <Label className="text-[10px] leading-none">Product</Label>
                    <VariantSearchSelect
                      variants={storeVariants}
                      value={`${item.item_id}|${item.storePrice}`}
                      onChange={(v) => handleVariantChange(index, v)}
                    />
                  </div>
                  {qtyInput}
                  {eurInput}
                  {usdInput}
                  {birrInput}
                  {visaInput}
                  {gbpInput}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => removeItem(index)}
                    disabled={form.items.length <= 1}
                    className="h-8 w-8"
                  >
                    <span className="text-destructive">×</span>
                  </Button>
                </div>
              </div>
            )
          })}

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addItem}
            disabled={storeVariants.length === 0}
          >
            + Add Item
          </Button>

          {storeVariants.length === 0 && !editing && (
            <p className="text-muted-foreground text-xs">
              No products available in store inventory.
            </p>
          )}

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
