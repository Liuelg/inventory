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
import { useCreateStore, useUpdateStore } from "../hooks"
import type { Store, StorePayload } from "../types"

interface StoreFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  editing?: Store | null
  onSuccess?: () => void
}

type StoreFormState = {
  name: string
  address: string
  managerId: string
}

const initialState: StoreFormState = {
  name: "",
  address: "",
  managerId: "",
}

function getManagerId(manager: Store["manager_id"]): string {
  if (!manager) return ""
  if (typeof manager === "string") return manager
  return manager._id ?? ""
}

function getInitialState(editing?: Store | null): StoreFormState {
  if (!editing) {
    return initialState
  }

  return {
    name: editing.name ?? "",
    address: editing.address ?? "",
    managerId: getManagerId(editing.manager_id),
  }
}

function toPayload(form: StoreFormState): StorePayload {
  return {
    name: form.name.trim(),
    address: form.address.trim(),
    manager_id: form.managerId.trim() || undefined,
  }
}

export function StoreForm({
  open,
  onOpenChange,
  editing,
  onSuccess,
}: StoreFormProps) {
  const [form, setForm] = useState<StoreFormState>(() => getInitialState(editing))
  const create = useCreateStore()
  const update = useUpdateStore()

  function setField<Key extends keyof StoreFormState>(
    key: Key,
    value: StoreFormState[Key]
  ) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim() || !form.address.trim()) return

    const payload = toPayload(form)
    if (editing) {
      update.mutate(
        { id: editing._id, payload },
        { onSuccess: () => onSuccess?.() }
      )
      return
    }

    create.mutate(payload, { onSuccess: () => onSuccess?.() })
  }

  const isPending = create.isPending || update.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? "Edit Store" : "Add Store"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid gap-2">
            <Label htmlFor="store-name">Name</Label>
            <Input
              id="store-name"
              placeholder="Store name"
              value={form.name}
              onChange={(e) => setField("name", e.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="store-address">Address</Label>
            <Input
              id="store-address"
              placeholder="Store address"
              value={form.address}
              onChange={(e) => setField("address", e.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="store-manager-id">Manager ID (optional)</Label>
            <Input
              id="store-manager-id"
              placeholder="MongoDB User ID"
              value={form.managerId}
              onChange={(e) => setField("managerId", e.target.value)}
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
              {editing ? "Update" : "Create"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
