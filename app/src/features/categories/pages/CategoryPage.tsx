import { CategoryTable } from "@/features/categories/components/CategoryTable";
import { SubCategoryTable } from "@/features/sub-categories/components/SubCategoryTable";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCallback, useState } from "react";

type CategoryTabType = 'categories' | 'sub-categories'

export function CategoryPage() {
  const [selectedTab, setSelectedTab] = useState<CategoryTabType>('categories')

  const onTabChange = useCallback((tab: string) => {
    setSelectedTab(tab as CategoryTabType)
  }, [])

  return (
    <Tabs defaultValue="categories" value={selectedTab} onValueChange={onTabChange} className="h-full w-full">
      <div className="flex w-full flex-col items-start justify-start gap-4">
        <div>
          <h1 className="text-2xl font-bold">Category</h1>
          <p className="text-sm text-gray-500">Setup category directory</p>
        </div>
        <TabsList>
          <TabsTrigger value="categories">Category</TabsTrigger>
          <TabsTrigger value="sub-categories">Sub Category</TabsTrigger>
        </TabsList>
      </div>
      <TabsContent value="categories" className="h-[calc(100%-100px)]">
        <CategoryTable />
      </TabsContent>
      <TabsContent value="sub-categories" className="h-[calc(100%-100px)]">
        <SubCategoryTable />
      </TabsContent>
    </Tabs>
  );
}
