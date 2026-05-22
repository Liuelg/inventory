import { Button } from "@/components/ui/button"
import { DataTable, type ColumnDef } from "@/components/Table.tsx"
import { useAuthSession } from "@/hooks/use-auth-session.ts"
import { useAccounts, useUpdateAccount } from "../hooks"
import type { AccountUser } from "../types"

export function AccountTable() {
  const { data: accounts, isLoading } = useAccounts()
  const { data: session } = useAuthSession()
  const update = useUpdateAccount()

  function toggleActive(user: AccountUser) {
    if (user._id === session?.id) return
    update.mutate({
      id: user._id,
      payload: { is_active: !user.is_active },
    })
  }

  const columns: ColumnDef<AccountUser>[] = [
    {
      header: "Name",
      cell: (u) => <span className="font-medium">{u.name}</span>,
    },
    { header: "Email", cell: (u) => u.email },
    { header: "Role", cell: (u) => u.role },
    {
      header: "Phone",
      cell: (u) => u.phone || "-",
    },
    {
      header: "Store",
      cell: (u) =>
        typeof u.store === "object" && u.store ? u.store.name : "-",
    },
    {
      header: "Status",
      className: "w-[100px]",
      cell: (u) => (
        <span
          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
            u.is_active !== false
              ? "bg-green-100 text-green-700"
              : "bg-red-100 text-red-700"
          }`}
        >
          {u.is_active !== false ? "Active" : "Inactive"}
        </span>
      ),
    },
    {
      header: "Actions",
      className: "w-[120px] text-right",
      cell: (u) => {
        const isSelf = u._id === session?.id
        const isActive = u.is_active !== false
        return (
          <Button
            variant="outline"
            size="sm"
            disabled={isSelf || update.isPending}
            onClick={() => toggleActive(u)}
            className={
              isActive
                ? "text-red-600 hover:bg-red-50 hover:text-red-700"
                : "text-green-600 hover:bg-green-50 hover:text-green-700"
            }
          >
            {isActive ? "Deactivate" : "Activate"}
          </Button>
        )
      },
    },
  ]

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-4">
      <DataTable
        data={accounts ?? []}
        columns={columns}
        keyExtractor={(u) => u._id}
        loading={isLoading}
        emptyMessage="No accounts found."
      />
    </div>
  )
}
