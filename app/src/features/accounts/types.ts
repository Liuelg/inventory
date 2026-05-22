export type AccountUser = {
  _id: string
  name: string
  email: string
  phone?: string
  role: string
  is_active?: boolean
  store?: string | { _id: string; name: string }
  createdAt?: string
}

export type CreateAccountPayload = {
  name: string
  email: string
  phone?: string
  password: string
  role: "sales" | "stock"
  store?: string
}
