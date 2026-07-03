import { GoodInTable } from "../components/GoodInTable"

export function GoodInPage() {
  return (
    <div className="flex h-full w-full flex-col gap-4">
      <div className="flex w-full flex-col sm:flex-row items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Stock In</h1>
          <p className="text-sm text-gray-500">
            Review and accept incoming stock transfers from the warehouse.
          </p>
        </div>
      </div>
      <GoodInTable />
    </div>
  )
}
