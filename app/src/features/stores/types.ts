export type StoreManager = {
  _id: string
  name?: string
  email?: string
}

export type StoreItem = {
  item_id: string
  quantity: number
  price: number
}

export type Store = {
  _id: string
  name: string
  code: string
  address: string
  manager_id?: string | StoreManager | null
  items?: StoreItem[]
}

export type StorePayload = {
  name: string
  code: string
  address: string
  manager_id?: string
}
