import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { AccountTable } from "../components/AccountTable"
import { AccountForm } from "../components/AccountForm"

export function AccountsPage() {
  const [formOpen, setFormOpen] = useState(false)

  return (
    <div className="flex h-full w-full flex-col gap-4">
      <div className="flex w-full flex-col sm:flex-row items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Accounts</h1>
          <p className="text-sm text-gray-500">
            Manage staff accounts.
          </p>
        </div>
        <Button onClick={() => setFormOpen(true)} className="w-full sm:w-auto">
          <Plus data-icon="inline-start" />
          Add Account
        </Button>
      </div>
      <AccountTable />
      <AccountForm
        open={formOpen}
        onOpenChange={setFormOpen}
        onSuccess={() => setFormOpen(false)}
      />
    </div>
  )
}
