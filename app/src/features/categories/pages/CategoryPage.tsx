import { useState, useCallback } from "react"
import { CategoryTable } from "@/features/categories/components/CategoryTable"
import { SubCategoryTable } from "@/features/sub-categories/components/SubCategoryTable"
import { CategoryForm } from "@/features/categories/components/CategoryForm"
import { SubCategoryForm } from "@/features/sub-categories/components/SubCategoryForm"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import type { Category } from "@/features/categories/types"
import type { SubCategory } from "@/features/sub-categories/types"

type CategoryTabType = "categories" | "sub-categories"

export function CategoryPage() {
  const [selectedTab, setSelectedTab] = useState<CategoryTabType>("categories")

  const [categoryFormOpen, setCategoryFormOpen] = useState(false)
  const [categoryEditing, setCategoryEditing] = useState<Category | null>(null)

  const [subCategoryFormOpen, setSubCategoryFormOpen] = useState(false)
  const [subCategoryEditing, setSubCategoryEditing] =
    useState<SubCategory | null>(null)

  const onTabChange = useCallback((tab: string) => {
    setSelectedTab(tab as CategoryTabType)
  }, [])

  const openAddCategory = () => {
    setCategoryEditing(null)
    setCategoryFormOpen(true)
  }

  const openEditCategory = (category: Category) => {
    setCategoryEditing(category)
    setCategoryFormOpen(true)
  }

  const openAddSubCategory = () => {
    setSubCategoryEditing(null)
    setSubCategoryFormOpen(true)
  }

  const openEditSubCategory = (subCategory: SubCategory) => {
    setSubCategoryEditing(subCategory)
    setSubCategoryFormOpen(true)
  }

  return (
    <Tabs
      defaultValue="categories"
      value={selectedTab}
      onValueChange={onTabChange}
      className="flex w-full flex-col"
    >
      <div className="flex w-full flex-col sm:flex-row items-start justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-2xl font-bold">Category</h1>
          <p className="text-sm text-gray-500">Setup category directory</p>
        </div>
        {selectedTab === "categories" ? (
          <Button onClick={openAddCategory} className="w-full sm:w-auto">
            <Plus data-icon="inline-start" />
            Add Category
          </Button>
        ) : (
          <Button onClick={openAddSubCategory} className="w-full sm:w-auto">
            <Plus data-icon="inline-start" />
            Add Sub Category
          </Button>
        )}
      </div>
      <TabsList className="mt-4 shrink-0">
        <TabsTrigger value="categories">Category</TabsTrigger>
        <TabsTrigger value="sub-categories">Sub Category</TabsTrigger>
      </TabsList>
      <TabsContent value="categories" className="min-h-0 flex-1 overflow-hidden">
        <CategoryTable onEdit={openEditCategory} />
      </TabsContent>
      <TabsContent value="sub-categories" className="min-h-0 flex-1 overflow-hidden">
        <SubCategoryTable onEdit={openEditSubCategory} />
      </TabsContent>

      <CategoryForm
        open={categoryFormOpen}
        onOpenChange={setCategoryFormOpen}
        editing={categoryEditing}
        onSuccess={() => {
          setCategoryFormOpen(false)
          setCategoryEditing(null)
        }}
      />

      <SubCategoryForm
        open={subCategoryFormOpen}
        onOpenChange={setSubCategoryFormOpen}
        editing={subCategoryEditing}
        onSuccess={() => {
          setSubCategoryFormOpen(false)
          setSubCategoryEditing(null)
        }}
      />
    </Tabs>
  )
}
