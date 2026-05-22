import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useStores } from "@/features/stores/hooks"
import { useCreateAccount } from "../hooks"

interface AccountFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

type AccountFormState = {
  name: string
  email: string
  phone: string
  password: string
  confirmPassword: string
  role: "sales" | "stock"
  store: string
}

const initialState: AccountFormState = {
  name: "",
  email: "",
  phone: "",
  password: "",
  confirmPassword: "",
  role: "stock",
  store: "",
}

export function AccountForm({
  open,
  onOpenChange,
  onSuccess,
}: AccountFormProps) {
  const [form, setForm] = useState<AccountFormState>(initialState)
  const [error, setError] = useState<string | null>(null)
  const { data: stores } = useStores()
  const create = useCreateAccount()

  function setField<Key extends keyof AccountFormState>(
    key: Key,
    value: AccountFormState[Key]
  ) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!form.name.trim()) {
      setError("Name is required")
      return
    }
    if (!form.email.trim()) {
      setError("Email is required")
      return
    }
    if (!form.password) {
      setError("Password is required")
      return
    }
    if (form.password.length < 8) {
      setError("Password must be at least 8 characters")
      return
    }
    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match")
      return
    }
    if (form.role === "sales" && !form.store) {
      setError("Store is required for sales users")
      return
    }

    const payload = {
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim() || undefined,
      password: form.password,
      role: form.role,
      store: form.role === "sales" ? form.store : undefined,
    }

    create.mutate(payload, {
      onSuccess: () => {
        setForm(initialState)
        onSuccess?.()
      },
      onError: (err) => setError(err.message),
    })
  }

  const isPending = create.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>Create Account</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {error ? (
            <p className="text-destructive text-sm" role="alert">
              {error}
            </p>
          ) : null}

          <div className="grid gap-2">
            <Label htmlFor="account-name">Name</Label>
            <Input
              id="account-name"
              placeholder="Full name"
              value={form.name}
              onChange={(e) => setField("name", e.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="account-email">Email</Label>
            <Input
              id="account-email"
              type="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={(e) => setField("email", e.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="account-phone">Phone (optional)</Label>
            <Input
              id="account-phone"
              type="tel"
              placeholder="+2519..."
              value={form.phone}
              onChange={(e) => setField("phone", e.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="account-role">Role</Label>
            <Select
              value={form.role}
              onValueChange={(v) =>
                setField("role", v as "sales" | "stock")
              }
            >
              <SelectTrigger id="account-role">
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sales">Sales (Store)</SelectItem>
                <SelectItem value="stock">Stock (Warehouse)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {form.role === "sales" ? (
            <div className="grid gap-2">
              <Label htmlFor="account-store">Store</Label>
              <Select
                value={form.store}
                onValueChange={(v) => setField("store", v)}
              >
                <SelectTrigger id="account-store">
                  <SelectValue placeholder="Select store" />
                </SelectTrigger>
                <SelectContent>
                  {stores?.map((s) => (
                    <SelectItem key={s._id} value={s._id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}

          <div className="grid gap-2">
            <Label htmlFor="account-password">Password</Label>
            <Input
              id="account-password"
              type="password"
              placeholder="At least 8 characters"
              value={form.password}
              onChange={(e) => setField("password", e.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="account-confirm">Confirm Password</Label>
            <Input
              id="account-confirm"
              type="password"
              placeholder="Repeat password"
              value={form.confirmPassword}
              onChange={(e) =>
                setField("confirmPassword", e.target.value)
              }
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Creating..." : "Create Account"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
