export type ProductGroupRef = {
  _id: string
  name: string
  image?: string | null
}

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
  group?: string | ProductGroupRef | null
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
  items: {
    item_id: string
    quantity: number
    price: number
    group?: string | null
  }[]
  totalAmount: number
  note?: string
}
