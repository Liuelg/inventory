import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
  code: string
  address: string
}

const initialState: StoreFormState = {
  name: "",
  code: "",
  address: "",
}

function getManagerName(manager: Store["manager_id"]): string {
  if (!manager) return "Not assigned"
  if (typeof manager === "string") return manager
  return manager.name ?? "Unknown"
}

function getInitialState(editing?: Store | null): StoreFormState {
  if (!editing) {
    return initialState
  }

  return {
    name: editing.name ?? "",
    code: editing.code ?? "",
    address: editing.address ?? "",
  }
}

function toPayload(form: StoreFormState): StorePayload {
  return {
    name: form.name.trim(),
    code: form.code.trim().toUpperCase(),
    address: form.address.trim(),
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
  const [error, setError] = useState<string | null>(null)

  function setField<Key extends keyof StoreFormState>(
    key: Key,
    value: StoreFormState[Key]
  ) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!form.name.trim() || !form.address.trim()) return

    const payload = toPayload(form)
    if (editing) {
      update.mutate(
        { id: editing._id, payload },
        {
          onSuccess: () => onSuccess?.(),
          onError: (err) => setError(err.message),
        }
      )
      return
    }

    create.mutate(payload, {
      onSuccess: () => onSuccess?.(),
      onError: (err) => setError(err.message),
    })
  }

  const isPending = create.isPending || update.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? "Edit Store" : "Add Store"}</DialogTitle>
          <DialogDescription>
            {editing
              ? "Update the store details."
              : "Fill in the details for the new store."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {error ? (
            <p className="text-destructive text-sm" role="alert">
              {error}
            </p>
          ) : null}
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
            <Label htmlFor="store-code">Branch Code</Label>
            <Input
              id="store-code"
              placeholder="e.g. MB"
              maxLength={4}
              value={form.code}
              onChange={(e) => setField("code", e.target.value)}
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

          {editing ? (
            <div className="grid gap-2">
              <Label htmlFor="store-manager-name">Manager</Label>
              <Input
                id="store-manager-name"
                value={getManagerName(editing.manager_id)}
                disabled
                className="bg-muted"
              />
            </div>
          ) : null}

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
