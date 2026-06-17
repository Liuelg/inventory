export type ProductGroupItem = {
  product:
    | string
    | {
        _id: string
        name?: string
        price?: { amount?: number }
        image?: string
        category?: string | { _id: string; name?: string }
        subCategory?: string | { _id: string; name?: string }
      }
  quantity: number
}

export type ProductGroup = {
  _id: string
  name: string
  image?: string
  category?: string | { _id: string; name?: string }
  subCategory?: string | { _id: string; name?: string }
  items: ProductGroupItem[]
  createdAt?: string
  updatedAt?: string
}

export type ProductGroupPayload = {
  name: string
  image?: string
  category?: string
  subCategory?: string
  items: (
    | { product: string; quantity: number }
    | {
        name: string
        quantity: number
        image?: string
        category?: string
        subCategory?: string
      }
  )[]
}
