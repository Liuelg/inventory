export type ProductPrice = {
  amount?: number
  currency?: string
}

export type ProductCategory = {
  _id: string
  name: string
}

export type Product = {
  _id: string
  name: string
  description?: string
  category?: string | ProductCategory
  price?: ProductPrice
  previous_prices?: number
  tags?: string[]
  image?: string
}

export type ProductPayload = {
  name: string
  description?: string
  category?: string
  price?: ProductPrice
  previous_prices?: number
  tags?: string[]
  image?: string
}
