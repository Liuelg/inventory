export type GoodInItem = {
  item_id: string
  quantity: number
  price: number
  _id?: string
}

export type GoodIn = {
  _id: string
  created_by: string | { _id: string; name?: string }
  date: string
  store: string | { _id: string; name?: string }
  user: string | { _id: string; name?: string; email?: string }
  items: GoodInItem[]
  is_accepted: boolean
  accepted_at: string | null
  createdAt?: string
  updatedAt?: string
}

export type GoodInPayload = {
  created_by: string
  date?: string
  store: string
  user: string
  items: Omit<GoodInItem, "_id">[]
  is_accepted?: boolean
  accepted_at?: string | null
}
