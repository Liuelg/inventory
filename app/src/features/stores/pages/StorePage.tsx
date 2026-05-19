import { StoreTable } from "../components/StoreTable"

export function StorePage() {
  return (
    <div className="flex h-full w-full flex-col gap-4">
      <div>
        <h1 className="text-2xl font-bold">Stores</h1>
        <p className="text-sm text-gray-500">
          Manage store locations and managers.
        </p>
      </div>
      <StoreTable />
    </div>
  )
}
