import type { Product } from "@/features/products/types"

export type SaleItem = {
  item_id: string | Product
  quantity: number
  eur: number
  usd: number
  birr: number
  visa: number
  image?: string
  _id?: string
}

export type Sale = {
  _id: string
  items: SaleItem[]
  totalAmount: number
  customerName?: string
  salesName?: string
  store: string | { _id: string; name?: string }
  processedBy: string | { _id: string; name?: string; email?: string }
  date_time: string
  invoiceNumber: string
  createdAt?: string
  updatedAt?: string
}

export type SalePayload = {
  items: Omit<SaleItem, "_id">[]
  totalAmount: number
  customerName?: string
  date_time?: string
}
