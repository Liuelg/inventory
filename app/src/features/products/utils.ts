const API_BASE = import.meta.env.VITE_API_URL ?? ""

export function getProductImageUrl(path?: string): string | undefined {
  if (!path) return undefined
  if (path.startsWith("data:") || path.startsWith("http")) return path
  return `${API_BASE}${path}`
}

export function getProductPrices(
  product: { price?: { amount?: number; currency?: string } | null; prices?: Array<{ amount?: number; currency?: string }> | null }
): Array<{ amount?: number; currency?: string }> {
  const result: Array<{ amount?: number; currency?: string }> = []
  if (product.price?.amount != null) {
    result.push(product.price)
  }
  if (product.prices) {
    for (const p of product.prices) {
      if (p.amount != null) {
        result.push(p)
      }
    }
  }
  return result
}

export function formatProductLabel(
  product: { name: string; price?: { amount?: number; currency?: string } | null }
): string {
  if (product.price?.amount != null) {
    const currency = product.price.currency || ""
    return `${product.name} (${product.price.amount}${currency ? " " + currency : ""})`
  }
  return product.name
}

export function getPriceCurrency(
  product: { price?: { amount?: number; currency?: string } | null; prices?: Array<{ amount?: number; currency?: string }> | null },
  targetPrice: number
): string | undefined {
  if (product.price?.amount === targetPrice) return product.price.currency
  if (product.prices) {
    for (const p of product.prices) {
      if (p.amount === targetPrice) return p.currency
    }
  }
  return product.price?.currency
}

export function formatVariantLabel(
  product: { name: string; price?: { amount?: number; currency?: string } | null; prices?: Array<{ amount?: number; currency?: string }> | null },
  itemPrice: number
): string {
  const currency = getPriceCurrency(product, itemPrice)
  return `${product.name} (${itemPrice}${currency ? " " + currency : ""})`
}

export function formatInventoryItemLabel(
  name: string,
  itemPrice: number,
  productCurrency?: string
): string {
  if (productCurrency) {
    return `${name} (${itemPrice} ${productCurrency})`
  }
  return `${name} (${itemPrice})`
}
