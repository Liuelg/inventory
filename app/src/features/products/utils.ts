const API_BASE = import.meta.env.VITE_API_URL ?? ""

export function getProductImageUrl(path?: string): string | undefined {
  if (!path) return undefined
  if (path.startsWith("data:") || path.startsWith("http")) return path
  return `${API_BASE}${path}`
}
