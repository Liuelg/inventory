export type StockoutItem = {
  item_id: string
  quantity: number
  price: number
  group?: string | null
}

export type StockoutItemPopulated = {
  item_id: {
    _id: string
    name: string
    category?: string
    image?: string
    price?: { amount?: number; currency?: string }
    prices?: Array<{ amount?: number; currency?: string }>
  }
  quantity: number
  price: number
  group?: string | { _id: string; name: string; image?: string | null } | null
}

export type Stockout = {
  _id: string
  created_by: string | { _id: string; name?: string; email?: string }
  date: string
  store: string | { _id: string; name?: string; address?: string }
  items: StockoutItemPopulated[]
  status: "pending" | "accepted" | "rejected"
  accepted_by: string | { _id: string; name?: string; email?: string } | null
  accepted_at: string | null
  note?: string
  createdAt?: string
  updatedAt?: string
}

export type StockoutPayload = {
  created_by: string
  date?: string
  store: string
  items: StockoutItem[]
  note?: string
}
