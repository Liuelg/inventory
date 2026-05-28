export type SaleItem = {
  item_id: string
  quantity: number
  price: number
  _id?: string
}

export type Sale = {
  _id: string
  items: SaleItem[]
  totalAmount: number
  customerName?: string
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
  processedBy: string
  date_time?: string
}
