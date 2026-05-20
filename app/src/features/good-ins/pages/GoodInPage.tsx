import { GoodInTable } from "../components/GoodInTable"

export function GoodInPage() {
  return (
    <div className="flex h-full w-full flex-col gap-4">
      <div>
        <h1 className="text-2xl font-bold">Stock In</h1>
        <p className="text-sm text-gray-500">Manage goods received and stock entries.</p>
      </div>
      <GoodInTable />
    </div>
  )
}
