import Store from '../models/Stores.js'

function getBasicAuthHeader(username, password) {
  return 'Basic ' + Buffer.from(`${username}:${password}`).toString('base64')
}

async function pedsRequest(store, action, body) {
  if (!store.pedsEnabled || !store.pedsBaseUrl) {
    throw new Error('PEDS not configured for this store')
  }

  const url = `${store.pedsBaseUrl}/PEDS/api/HoldSalesService/${action}`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: getBasicAuthHeader(store.pedsUsername, store.pedsPassword),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  const text = await res.text()
  let data
  try {
    data = JSON.parse(text)
  } catch {
    data = { raw: text }
  }

  if (!res.ok) {
    const err = new Error(`PEDS HTTP ${res.status}: ${data.Message || text}`)
    err.status = res.status
    err.pedsResponse = data
    throw err
  }

  return data
}

/**
 * Push a pre-sale (hold sale) into PEDS POS.
 * @param {object} store
 * @param {object} payload - HoldSales payload per PEDS spec
 */
export async function addHoldSale(store, payload) {
  return pedsRequest(store, 'Add', payload)
}

/**
 * Check if an invoice number exists in PEDS.
 * @param {object} store
 * @param {string} invoiceNo
 */
export async function checkInvoiceExists(store, invoiceNo) {
  return pedsRequest(store, 'Exists', invoiceNo)
}

/**
 * Get invoice payment status (NotPaid, FullyPaid, PartiallyPaid, FullyVoid).
 * @param {object} store
 * @param {string} invoiceNo
 */
export async function getInvoiceStatus(store, invoiceNo) {
  return pedsRequest(store, 'GetInvoiceStatus', invoiceNo)
}

/**
 * Batch invoice status check.
 * @param {object} store
 * @param {string[]} invoiceNos
 */
export async function getInvoiceStatusList(store, invoiceNos) {
  return pedsRequest(store, 'GetInvoiceStatusList', invoiceNos)
}

/**
 * Get full paid receipt details for an invoice.
 * @param {object} store
 * @param {string} invoiceNo
 */
export async function getPaidStatus(store, invoiceNo) {
  return pedsRequest(store, 'GetPaidStatus', invoiceNo)
}

/**
 * Batch paid status check.
 * @param {object} store
 * @param {string[]} invoiceNos
 */
export async function getPaidStatusList(store, invoiceNos) {
  return pedsRequest(store, 'GetPaidStatusList', invoiceNos)
}

/**
 * Pull sales that occurred within the last N minutes.
 * @param {object} store
 * @param {number} minutes
 */
export async function getSalesByTime(store, minutes) {
  return pedsRequest(store, 'GetSalesByTime', minutes)
}

/**
 * Get full sales info for an invoice.
 * @param {object} store
 * @param {string} invoiceNo
 */
export async function getSalesInfo(store, invoiceNo) {
  return pedsRequest(store, 'GetSalesInfo', invoiceNo)
}

/**
 * Check if an invoice is voided.
 * @param {object} store
 * @param {string} invoiceNo
 */
export async function getVoidStatus(store, invoiceNo) {
  return pedsRequest(store, 'GetVoidStatus', invoiceNo)
}

/**
 * Batch void status check.
 * @param {object} store
 * @param {string[]} invoiceNos
 */
export async function getVoidStatusList(store, invoiceNos) {
  return pedsRequest(store, 'GetVoidStatusList', invoiceNos)
}

/**
 * Void an invoice in PEDS.
 * @param {object} store
 * @param {string} invoiceNo
 */
export async function voidInvoice(store, invoiceNo) {
  return pedsRequest(store, 'Void', invoiceNo)
}

/**
 * Test connectivity to PEDS by calling Exists with a dummy invoice.
 * A valid HTTP response (even "not found") proves the tunnel, URL,
 * and credentials are correct.
 * @param {object} store
 */
export async function testConnection(store) {
  return pedsRequest(store, 'Exists', 'TEST-CONN')
}

/**
 * Build a PEDS HoldSales payload from IMS sale data.
 * @param {object} store
 * @param {object} sale - IMS sale document (populated items)
 * @param {object[]} products - Array of populated product docs
 */
export function buildHoldSalePayload(store, sale, productsMap) {
  const dateStr = sale.date_time
    ? new Date(sale.date_time).toISOString().replace('T', ' ').slice(0, 19)
    : new Date().toISOString().replace('T', ' ').slice(0, 19)

  const holdSalesItems = sale.items.map((item, idx) => {
    const product = productsMap.get(item.item_id?.toString?.())
    return {
      HoldSalesItemIdentifierId: `${sale.invoiceNumber}-L${idx}`,
      CategoryIdentifierId: product?.category?.toString?.() || 'cat-default',
      CategoryName: product?.categoryName || 'General',
      ItemIdentifierId: product?.pedsItemId || product?._id?.toString?.() || item.item_id.toString(),
      ItemDescription: product?.name || 'Unknown',
      ItemCode: product?.code || product?._id?.toString?.() || item.item_id.toString(),
      UomIdentifierId: 'uom-pcs',
      UomName: 'Pcs',
      Quantity: item.quantity,
      SalesUnitPrice: product?.price?.amount || 0,
      TaxType: product?.taxType ?? 4,
    }
  })

  return {
    HoldSalesIdentifierId: sale.invoiceNumber,
    TransactionType: '0', // Sales = 0
    InvoiceNo: sale.invoiceNumber,
    PaymentType: '0', // CASH=0, CHECK=1, CREDIT=2
    TableNumber: '',
    SalesPerson: sale.salesName || '',
    HoldMemo: '',
    Date: dateStr,
    CustomerName: sale.customerName || 'Walk-in',
    CustomerTIN: '',
    CustomerVAT: '',
    CashierUpdated: sale.salesName || 'System',
    POSId: store.pedsPosId || 'POS-001',
    HoldSalesItems: holdSalesItems,
  }
}
