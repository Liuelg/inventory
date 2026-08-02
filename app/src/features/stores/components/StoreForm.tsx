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
import { useCreateStore, useUpdateStore, useTestPedsConnection } from "../hooks"
import type { Store, StorePayload } from "../types"
import { Loader2, CheckCircle2, XCircle } from "lucide-react"

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
  pedsEnabled: boolean
  pedsBaseUrl: string
  pedsPosId: string
  pedsMachineId: string
  pedsUsername: string
  pedsPassword: string
}

const initialState: StoreFormState = {
  name: "",
  code: "",
  address: "",
  pedsEnabled: false,
  pedsBaseUrl: "",
  pedsPosId: "",
  pedsMachineId: "",
  pedsUsername: "",
  pedsPassword: "",
}

function getManagerName(store: Store): string {
  // Prefer sales person (store staff) over manager_id — same logic as StoreTable
  const sp = store.salesPerson
  if (sp?.name) return sp.name

  const manager = store.manager_id
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
    pedsEnabled: editing.pedsEnabled ?? false,
    pedsBaseUrl: editing.pedsBaseUrl ?? "",
    pedsPosId: editing.pedsPosId ?? "",
    pedsMachineId: editing.pedsMachineId ?? "",
    pedsUsername: editing.pedsUsername ?? "",
    pedsPassword: editing.pedsPassword ?? "",
  }
}

function toPayload(form: StoreFormState): StorePayload {
  return {
    name: form.name.trim(),
    code: form.code.trim().toUpperCase(),
    address: form.address.trim(),
    pedsEnabled: form.pedsEnabled,
    pedsBaseUrl: form.pedsBaseUrl.trim() || undefined,
    pedsPosId: form.pedsPosId.trim() || undefined,
    pedsMachineId: form.pedsMachineId.trim() || undefined,
    pedsUsername: form.pedsUsername.trim() || undefined,
    pedsPassword: form.pedsPassword || undefined,
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
  const testPeds = useTestPedsConnection()
  const [error, setError] = useState<string | null>(null)
  const [testResult, setTestResult] = useState<{
    type: "success" | "error"
    message: string
  } | null>(null)

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

  function handleTestConnection() {
    if (!editing) return
    setTestResult(null)
    testPeds.mutate(editing._id, {
      onSuccess: (data) => {
        setTestResult({
          type: "success",
          message: data.connected
            ? `Connected — ${data.message}`
            : `PEDS responded but connection failed — ${data.message}`,
        })
      },
      onError: (err) => {
        setTestResult({
          type: "error",
          message: err.message || "Failed to reach PEDS. Check the Base URL and credentials.",
        })
      },
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
                value={getManagerName(editing)}
                disabled
                className="bg-muted"
              />
            </div>
          ) : null}

          <div className="border-t pt-4 mt-2">
            <label className="flex items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                checked={form.pedsEnabled}
                onChange={(e) => setField("pedsEnabled", e.target.checked)}
                className="h-4 w-4"
              />
              Enable PEDS POS Integration
            </label>
          </div>

          {form.pedsEnabled && (
            <div className="flex flex-col gap-3 rounded-md border p-3">
              <div className="grid gap-2">
                <Label htmlFor="peds-base-url">PEDS Base URL</Label>
                <Input
                  id="peds-base-url"
                  placeholder="http://192.168.1.50:2010"
                  value={form.pedsBaseUrl}
                  onChange={(e) => setField("pedsBaseUrl", e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-2">
                  <Label htmlFor="peds-pos-id">POS ID</Label>
                  <Input
                    id="peds-pos-id"
                    placeholder="POS-001"
                    value={form.pedsPosId}
                    onChange={(e) => setField("pedsPosId", e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="peds-machine-id">Machine ID</Label>
                  <Input
                    id="peds-machine-id"
                    placeholder="AAD0001230"
                    value={form.pedsMachineId}
                    onChange={(e) => setField("pedsMachineId", e.target.value)}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-2">
                  <Label htmlFor="peds-username">Username</Label>
                  <Input
                    id="peds-username"
                    placeholder="PEDSAPI"
                    value={form.pedsUsername}
                    onChange={(e) => setField("pedsUsername", e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="peds-password">Password</Label>
                  <Input
                    id="peds-password"
                    type="password"
                    placeholder="••••••"
                    value={form.pedsPassword}
                    onChange={(e) => setField("pedsPassword", e.target.value)}
                  />
                </div>
              </div>

              {editing && (
                <div className="flex flex-col gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-fit"
                    disabled={testPeds.isPending || !form.pedsBaseUrl.trim()}
                    onClick={handleTestConnection}
                  >
                    {testPeds.isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Test PEDS Connection
                  </Button>
                  {testResult && (
                    <div
                      className={`flex items-center gap-2 text-sm ${
                        testResult.type === "success"
                          ? "text-green-600"
                          : "text-destructive"
                      }`}
                    >
                      {testResult.type === "success" ? (
                        <CheckCircle2 className="h-4 w-4 shrink-0" />
                      ) : (
                        <XCircle className="h-4 w-4 shrink-0" />
                      )}
                      {testResult.message}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

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
