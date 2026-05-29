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

export type StoreSalesPerson = {
  _id: string
  name: string
  email?: string
}

export type Store = {
  _id: string
  name: string
  code: string
  address: string
  manager_id?: string | StoreManager | null
  salesPerson?: StoreSalesPerson | null
  items?: StoreItem[]
}

export type StorePayload = {
  name: string
  code: string
  address: string
  manager_id?: string
}
