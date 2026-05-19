import { clearAuthSession, getAuthToken } from "@/lib/auth"

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3000"

export async function fetcher<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const token = getAuthToken()
  const headers = new Headers(options?.headers)
  headers.set("Content-Type", "application/json")
  if (token) {
    headers.set("Authorization", `Bearer ${token}`)
  }
  const res = await fetch(`${API_BASE}${path}`, {
    headers,
    ...options,
  })
  const json = await res.json().catch(() => null)
  if (res.status === 401) {
    clearAuthSession()
  }
  if (!res.ok) {
    const message =
      json?.message || json?.error || `Request failed: ${res.status}`
    throw new Error(message)
  }
  return json
}
