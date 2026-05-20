import { SalesTable } from "../components/SalesTable"

export function SalesPage() {
  return (
    <div className="flex h-full w-full flex-col gap-4">
      <div>
        <h1 className="text-2xl font-bold">Sales</h1>
        <p className="text-sm text-gray-500">Manage sales and invoices.</p>
      </div>
      <SalesTable />
    </div>
  )
}
