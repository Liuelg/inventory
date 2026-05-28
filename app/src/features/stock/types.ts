export type StockItem = {
  item_id:
    | string
    | {
        _id: string
        name?: string
        category?: string | { _id: string; name?: string }
        image?: string
      }
  quantity: number
  remaining: number
  price: number
  _id?: string
}

export type Stock = {
  _id: string
  created_by: string | { _id: string; name?: string; email?: string }
  date: string
  items: StockItem[]
  totalAmount: number
  description?: string
  note?: string
  createdAt?: string
  updatedAt?: string
}

export type StockPayload = {
  created_by: string
  date?: string
  items: Omit<StockItem, "_id" | "remaining">[]
  totalAmount: number
  note?: string
}
