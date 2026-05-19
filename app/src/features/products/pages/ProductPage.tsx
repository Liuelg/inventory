import { ProductTable } from "../components/ProductTable"

export function ProductPage() {
  return (
    <div className="flex h-full w-full flex-col gap-4">
      <div>
        <h1 className="text-2xl font-bold">Products</h1>
        <p className="text-sm text-gray-500">Manage products and pricing.</p>
      </div>
      <ProductTable />
    </div>
  )
}
