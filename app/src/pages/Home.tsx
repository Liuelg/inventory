import { TableDemo } from "@/components/Table"
import { Button } from "@/components/ui/button"
import { PlusIcon } from "lucide-react"

export function Home() {
  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex w-full flex-row items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Home</h1>
          <p className="text-sm text-gray-500">Welcome to the home page</p>
        </div>
        <div>
          <Button>
            <PlusIcon className="h-4 w-4" />
            Add
          </Button>
        </div>
      </div>
      <TableDemo />
    </div>
  )
}
