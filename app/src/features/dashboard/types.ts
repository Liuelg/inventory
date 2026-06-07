export type DashboardStore = {
  _id: string
  name: string
  address: string
}

export type DailySalesRow = {
  store: DashboardStore
  totalSales: number
  transactions: number
  itemsSold: number
  productsInStock: number
}

export type StoreSaleItem = {
  name: string
  quantity: number
  price: number
}

export type StoreSale = {
  _id: string
  invoiceNumber: string
  customerName?: string
  totalAmount: number
  items: StoreSaleItem[]
  processedBy: string
  date_time: string
}

export type StoreRemainingProduct = {
  product: {
    _id: string
    name: string
    category: string
    image?: string | null
  }
  quantity: number
  price: number
  group?: {
    _id: string
    name: string
    image?: string | null
  } | null
}

export type StoreDailyDetail = {
  store: DashboardStore
  todaySales: {
    totalSales: number
    transactions: number
    itemsSold: number
  }
  sales: StoreSale[]
  remainingProducts: StoreRemainingProduct[]
}
