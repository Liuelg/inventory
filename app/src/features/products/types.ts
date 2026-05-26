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
  subCategory?: string | ProductCategory
  price?: ProductPrice
  previous_prices?: number
  tags?: string[]
  image?: string
}

export type ProductPayload = {
  name: string
  description?: string
  category?: string
  subCategory?: string
  price?: ProductPrice
  previous_prices?: number
  tags?: string[]
  image?: string
}
