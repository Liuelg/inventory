export const api = {
  async request<T>(path: string, options?: RequestInit): Promise<T> {
    const baseURL = import.meta.env.VITE_API_URL ?? ""
    const response = await fetch(`${baseURL}${path}`, {
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
      },
      ...options,
    })

    const payload = await response.json().catch(() => null)
    if (!response.ok) {
      const message =
        payload?.message || payload?.error || `Request failed: ${response.status}`
      throw new Error(message)
    }

    return payload as T
  },
}