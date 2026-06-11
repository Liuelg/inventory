import { useMemo, useState } from "react"
import { ProductTable } from "../components/ProductTable"
import { ProductForm } from "../components/ProductForm"
import { ProductGroupForm } from "@/features/product-groups/components/ProductGroupForm"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Plus, Layers, Search } from "lucide-react"
import { useProducts } from "../hooks"
import { useCategories } from "@/features/categories/hooks"
import type { Product } from "../types"

function getCategoryId(product: Product): string {
  if (!product.category) return ""
  return typeof product.category === "string"
    ? product.category
    : product.category._id
}

export function ProductPage() {
  const [formOpen, setFormOpen] = useState(false)
  const [groupFormOpen, setGroupFormOpen] = useState(false)
  const [editing, setEditing] = useState<Product | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string>("all")

  const { data: products, isLoading } = useProducts()
  const { data: categories } = useCategories()

  const filteredProducts = useMemo(() => {
    if (!products) return []
    let result = products

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase()
      result = result.filter((p) => p.name.toLowerCase().includes(q))
    }

    if (selectedCategory && selectedCategory !== "all") {
      result = result.filter((p) => getCategoryId(p) === selectedCategory)
    }

    return result
  }, [products, searchQuery, selectedCategory])

  const openAdd = () => {
    setEditing(null)
    setFormOpen(true)
  }

  const openEdit = (product: Product) => {
    setEditing(product)
    setFormOpen(true)
  }

  return (
    <div className="flex h-full w-full flex-col gap-4">
      <div className="flex w-full flex-row items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">Products</h1>
            {filteredProducts ? (
              <span className="rounded-full bg-muted px-2.5 py-0.5 text-sm font-medium text-muted-foreground">
                {filteredProducts.length}
              </span>
            ) : null}
          </div>
          <p className="text-sm text-gray-500">Manage products and pricing.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setGroupFormOpen(true)}>
            <Layers className="mr-1 h-4 w-4" />
            Create Group
          </Button>
          <Button onClick={openAdd}>
            <Plus data-icon="inline-start" />
            Add Product
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="grid gap-1.5 flex-1">
          <Label className="text-xs text-muted-foreground">Search by name</Label>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
        <div className="grid gap-1.5 w-full sm:w-[220px]">
          <Label className="text-xs text-muted-foreground">Filter by category</Label>
          <Select
            value={selectedCategory}
            onValueChange={setSelectedCategory}
          >
            <SelectTrigger>
              <SelectValue placeholder="All categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {categories?.map((c) => (
                <SelectItem key={c._id} value={c._id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <ProductTable
        products={filteredProducts}
        isLoading={isLoading}
        onEdit={openEdit}
      />
      {formOpen ? (
        <ProductForm
          key={editing?._id ?? "new-product"}
          open={formOpen}
          onOpenChange={setFormOpen}
          editing={editing}
          onSuccess={() => {
            setFormOpen(false)
            setEditing(null)
          }}
        />
      ) : null}
      <ProductGroupForm
        open={groupFormOpen}
        onOpenChange={setGroupFormOpen}
        onSuccess={() => setGroupFormOpen(false)}
      />
    </div>
  )
}
