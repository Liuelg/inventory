export type StoreManager = {
  _id: string
  name?: string
  email?: string
}

export type StoreItem = {
  item_id: string | {
    _id: string
    name?: string
    category?: string | { _id: string; name?: string }
    image?: string
  }
  quantity: number
  price: number
  group?: string | { _id: string; name: string; image?: string | null } | null
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
  pedsEnabled?: boolean
  pedsBaseUrl?: string
  pedsPosId?: string
  pedsMachineId?: string
  pedsUsername?: string
  pedsPassword?: string
}

export type StorePayload = {
  name: string
  code: string
  address: string
  manager_id?: string
  pedsEnabled?: boolean
  pedsBaseUrl?: string
  pedsPosId?: string
  pedsMachineId?: string
  pedsUsername?: string
  pedsPassword?: string
}
