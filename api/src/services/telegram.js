import { Telegraf } from 'telegraf';
import cron from 'node-cron';
import * as XLSX from 'xlsx'; 
import Sale from '../models/Sale.js';

// 1. Initialize Bot First
const botToken = process.env.TELEGRAM_BOT_TOKEN;
const chatId = process.env.TELEGRAM_CHAT_ID;
const bot = botToken ? new Telegraf(botToken) : null;

// Helper to get local Ethiopian date as a string (YYYY-MM-DD)
function getEthiopianDateString() {
  const options = { timeZone: 'Africa/Addis_Ababa', year: 'numeric', month: '2-digit', day: '2-digit' };
  const formatter = new Intl.DateTimeFormat('en-US', options);
  const [{ value: month }, , { value: day }, , { value: year }] = formatter.formatToParts(new Date());
  return `${year}-${month}-${day}`;
}

// Server-side equivalent of getCurrencySymbol
function getServerCurrencySymbol(currency) {
  switch (String(currency || 'usd').toLowerCase()) {
    case 'birr': return 'ETB';
    case 'eur': return '€';
    case 'usd': return '$';
    default: return '$';
  }
}

// Server-side equivalent of getReportTypeLabel
function getReportTypeLabel(type) {
  switch (type) {
    case 'goodIns': return 'Stock In';
    case 'stockouts': return 'Stock Out';
    case 'sales': return 'Sales';
    case 'remaining': return 'Remaining Products';
    default: return 'Report';
  }
}

/**
 * Ported Version of your generateReportExcel utility function (Adapted for Node.js)
 * Generates an in-memory Excel Buffer instead of writing directly to disk
 */
function buildReportExcelBuffer(report) {
  const wb = XLSX.utils.book_new();
  const currencyStr = String(report?.currency || 'usd').toUpperCase(); // 🛡️ Safe fallback formatting
  const sym = getServerCurrencySymbol(report?.currency);
  const typeLabel = getReportTypeLabel(report?.type);
  
  const dateRange =
    report?.type === 'remaining'
      ? new Date(report.start || Date.now()).toLocaleDateString('en-US', { timeZone: 'Africa/Addis_Ababa' })
      : `${new Date(report?.start || Date.now()).toLocaleDateString('en-US', { timeZone: 'Africa/Addis_Ababa' })} – ${new Date(report?.end || Date.now()).toLocaleDateString('en-US', { timeZone: 'Africa/Addis_Ababa' })}`;

  const hasTransactions = report?.transactions && report.transactions.length > 0;
  const hasRecords = report?.records && report.records.length > 0;
  const hasBreakdown = report?.breakdown && report.breakdown.length > 0;

  // ============================================================
  // SHEET 1: Detailed Records
  // ============================================================
  if (hasTransactions) {
    // SHEET 1a: By Transaction
    const transactionRows = [];
    for (const t of report.transactions) {
      const totalItems = (t.items || []).reduce((sum, item) => sum + (item.quantity || 0), 0);
      transactionRows.push({
        'Invoice #': t.invoiceNumber || '—',
        Date: t.date ? new Date(t.date).toLocaleString('en-US', { timeZone: 'Africa/Addis_Ababa' }) : '—',
        Store: t.storeName || '—',
        'Sales Person': t.salesName || '—',
        Customer: t.customerName || '—',
        'Total Items': totalItems,
        'Total Amount': t.totalAmount || 0,
      });
    }
    const transactionWs = XLSX.utils.json_to_sheet(transactionRows);
    XLSX.utils.sheet_add_aoa(
      transactionWs,
      [[`Values shown in ${currencyStr} (${sym})`]],
      { origin: -1 }
    );
    XLSX.utils.book_append_sheet(wb, transactionWs, 'By Transaction');

    // SHEET 1b: All Sales (exploded detail)
    const txRows = [];
    for (const t of report.transactions) {
      for (const item of t.items || []) {
        txRows.push({
          'Invoice #': t.invoiceNumber || '—',
          Date: t.date ? new Date(t.date).toLocaleString('en-US', { timeZone: 'Africa/Addis_Ababa' }) : '—',
          Store: t.storeName || '—',
          'Sales Person': t.salesName || '—',
          Customer: t.customerName || '—',
          Product: item.product?.name || 'Unknown Product',
          Quantity: item.quantity || 0,
          Value: item.value || 0,
          EUR: item.eur ?? 0,
          USD: item.usd ?? 0,
          BIRR: item.birr ?? 0,
          VISA: item.visa ?? 0,
        });
      }
    }
    const txWs = XLSX.utils.json_to_sheet(txRows);
    XLSX.utils.sheet_add_aoa(
      txWs,
      [[`Values shown in ${currencyStr} (${sym})`]],
      { origin: -1 }
    );
    XLSX.utils.book_append_sheet(wb, txWs, 'All Sales');
  } else if (hasRecords) {
    const recordRows = [];
    for (const r of report.records) {
      for (const item of r.items || []) {
        const row = {
          Date: r.date ? new Date(r.date).toLocaleString('en-US', { timeZone: 'Africa/Addis_Ababa' }) : '—',
          Store: r.storeName || '—',
          Product: item.product?.name || 'Unknown Product',
          Quantity: item.quantity || 0,
          'Unit Price': item.price || 0,
          Value: item.value || 0,
        };
        if (r.invoiceNumber) row['Invoice #'] = r.invoiceNumber;
        if (r.customerName) row['Customer'] = r.customerName;
        if (r.salesName) row['Sales Person'] = r.salesName;
        if (r.status) row['Status'] = r.status;
        if (item.eur) row['EUR'] = item.eur;
        if (item.usd) row['USD'] = item.usd;
        if (item.birr) row['BIRR'] = item.birr;
        if (item.visa) row['VISA'] = item.visa;
        recordRows.push(row);
      }
    }
    const recordsWs = XLSX.utils.json_to_sheet(recordRows);
    XLSX.utils.sheet_add_aoa(
      recordsWs,
      [[`Values shown in ${currencyStr} (${sym})`]],
      { origin: -1 }
    );
    XLSX.utils.book_append_sheet(wb, recordsWs, 'All Records');
  } else {
    // 🛡️ Always generate a fallback sheet if there is no data so the workbook structure remains valid
    const detailRows = hasBreakdown 
      ? report.breakdown.map((item) => ({
          Product: item.product?.name || 'Unknown',
          Quantity: item.quantity || 0,
          Value: item.value || 0,
        }))
      : [{ Product: 'No records found for today', Quantity: 0, Value: 0 }];

    const detailWs = XLSX.utils.json_to_sheet(detailRows);
    XLSX.utils.sheet_add_aoa(
      detailWs,
      [[`Values shown in ${currencyStr} (${sym})`]],
      { origin: -1 }
    );
    XLSX.utils.book_append_sheet(wb, detailWs, 'Details');
  }

  // ============================================================
  // SHEET 2: Summary
  // ============================================================
  const summaryRows = [
    ['Inventory Report'],
    [],
    ['Type', typeLabel],
    ['Date Range', dateRange],
    ['Store', report?.storeFilter || 'All Stores'],
    [],
    ['Metric', 'Value'],
    ['Total Records', report?.summary?.totalRecords || 0],
    ['Total Items', report?.summary?.totalItems || 0],
    [
      'Total Value',
      `${sym}${(report?.summary?.totalValue || 0).toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`,
    ],
  ];
  const summaryWs = XLSX.utils.aoa_to_sheet(summaryRows);
  XLSX.utils.book_append_sheet(wb, summaryWs, 'Summary');

  // ============================================================
  // SHEET 3: By Product
  // ============================================================
  if (hasBreakdown) {
    const productData = report.breakdown.map((item) => ({
      Product: item.product?.name || 'Unknown Product',
      Quantity: item.quantity || 0,
      Value: item.value || 0,
    }));
    const productWs = XLSX.utils.json_to_sheet(productData);
    XLSX.utils.sheet_add_aoa(
      productWs,
      [[`Values shown in ${currencyStr} (${sym})`]],
      { origin: -1 }
    );
    XLSX.utils.book_append_sheet(wb, productWs, 'By Product');
  }

  // ============================================================
  // SHEET 4: By Store
  // ============================================================
  if (report?.byStore && report.byStore.length > 0) {
    const storeData = report.byStore.map((item) => ({
      Store: item.store?.name || 'Unknown Store',
      Records: item.records || 0,
      Quantity: item.quantity || 0,
      Value: item.value || 0,
    }));
    const storeWs = XLSX.utils.json_to_sheet(storeData);
    XLSX.utils.sheet_add_aoa(
      storeWs,
      [[`Values shown in ${currencyStr} (${sym})`]],
      { origin: -1 }
    );
    XLSX.utils.book_append_sheet(wb, storeWs, 'By Store');
  }

  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
}

/**
 * Compiles the database entries into the exact frontend 'ReportData' shape
 */
async function generateDailyReportData(startDateStr) {
  const [year, month, day] = startDateStr.split('-').map(Number);
  const baseUtcMidnight = new Date(Date.UTC(year, month - 1, day));
  const startRange = new Date(baseUtcMidnight.getTime() - (180 * 60000)); 
  const endRange = new Date(baseUtcMidnight.getTime() - (180 * 60000) + (24 * 60 * 60 * 1000));

  const todaysSales = await Sale.find({
    date_time: { $gte: startRange, $lt: endRange }
  }).populate('items.item_id', 'name').populate('store', 'name');

  const transactions = [];
  const productMap = new Map();
  let totalSalesValue = 0;
  let totalSalesItems = 0;

  for (const sale of todaysSales) {
    totalSalesValue += sale.totalAmount || 0;
    const transactionItems = [];

    for (const item of sale.items || []) {
      const qty = item.quantity || 0;
      totalSalesItems += qty;
      const pName = item.item_id?.name || 'Unknown Product';
      const pId = item.item_id?._id?.toString() || '—';

      const existing = productMap.get(pId) || { product: { _id: pId, name: pName }, quantity: 0, value: 0 };
      existing.quantity += qty;
      existing.value += (item.price || 0) * qty;
      productMap.set(pId, existing);

      transactionItems.push({
        product: { _id: pId, name: pName },
        quantity: qty,
        value: (item.price || 0) * qty,
        eur: item.eur || 0,
        usd: item.usd || 0,
        birr: item.birr || 0,
        visa: item.visa || 0,
      });
    }

    transactions.push({
      invoiceNumber: sale.invoiceNumber || '—',
      date: sale.date_time?.toISOString(),
      storeName: sale.store?.name || 'Unknown Store',
      salesName: sale.salesName || 'N/A',
      customerName: sale.customerName || 'N/A',
      totalAmount: sale.totalAmount || 0,
      items: transactionItems,
    });
  }

  return {
    type: 'sales',
    start: startRange.toISOString(),
    end: endRange.toISOString(),
    storeFilter: null,
    currency: 'usd', 
    summary: {
      totalRecords: todaysSales.length,
      totalItems: totalSalesItems,
      totalValue: totalSalesValue,
    },
    breakdown: Array.from(productMap.values()),
    byStore: [],
    transactions,
    records: [],
  };
}

/**
 * Main automated task scheduler
 */
async function sendDailyReport() {
  if (!bot || !chatId) {
    console.log('[cron] Skipping report dispatch: Bot or Chat ID missing');
    return;
  }

  try {
    console.log('[cron] Compiling detailed frontend-matched database reports...');
    const todayStr = getEthiopianDateString();

    const reportData = await generateDailyReportData(todayStr);

    const textSummaryMessage = [
      '📊 <b>DAILY DISPATCH UPDATE (EAT)</b>',
      `📅 Date: <b>${todayStr}</b>`,
      '--------------------------------',
      `💰 <b>Total Sales:</b> $${(reportData.summary.totalValue || 0).toFixed(2)}`,
      `🧾 <b>Total Orders:</b> ${reportData.summary.totalRecords}`,
      `📦 <b>Total Items Sold:</b> ${reportData.summary.totalItems}`,
      '',
      '📁 <i>The live front-end structured Excel sheet is generated and attached below.</i>'
    ].join('\n');

    const excelBuffer = buildReportExcelBuffer(reportData);

    await bot.telegram.sendMessage(chatId, textSummaryMessage, { parse_mode: 'HTML' });
    
    await bot.telegram.sendDocument(chatId, {
      source: excelBuffer,
      filename: `Sales_Report_${todayStr}.xlsx`
    }, {
      caption: `📈 Excel Sales Report Summary - ${todayStr}`
    });

    console.log('[cron] Automated dispatch successfully completed.');
  } catch (err) {
    console.error('[cron] Automated dispatch crashed:', err.message);
  }
}

// 5. Scheduler Rule: 00:00 (Midnight) Ethiopian Time
cron.schedule('0 0 * * *', () => {
  sendDailyReport();
}, {
  scheduled: true,
  timezone: "Africa/Addis_Ababa"
});

/**
 * Send individual Telegram sale notifications.
 */
export async function sendSaleNotification(sale, store) {
  if (!bot || !chatId) {
    console.log('[telegram] Skipping notification: TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID not set');
    return;
  }

  const dateStr = sale.date_time
    ? new Date(sale.date_time).toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Africa/Addis_Ababa',
      })
    : new Date().toLocaleString('en-US', { timeZone: 'Africa/Addis_Ababa' });

  const itemsText = (sale.items || [])
    .map((item) => {
      const name = item.item_id?.name || 'Unknown Product';
      return `  • ${escapeHtml(name)} × ${item.quantity}`;
    })
    .join('\n');

  const message = [
    '🛒 <b>New Sale</b>',
    '',
    `🏪 <b>Store:</b> ${escapeHtml(store?.name || 'Unknown')}`,
    `🧾 <b>Invoice:</b> ${escapeHtml(sale.invoiceNumber || 'N/A')}`,
    `👤 <b>Sales Person:</b> ${escapeHtml(sale.salesName || 'N/A')}`,
    `📅 <b>Date:</b> ${dateStr}`,
    '',
    '<b>Items:</b>',
    itemsText || '  • No items',
    '',
    `💰 <b>Total Amount:</b> $${(sale.totalAmount || 0).toFixed(2)}`,
  ].join('\n');

  try {
    await bot.telegram.sendMessage(chatId, message, { parse_mode: 'HTML' });
    console.log('[telegram] Sale notification sent for invoice:', sale.invoiceNumber);
  } catch (err) {
    console.error('[telegram] Failed to send sale notification:', err.message);
  }
}

function escapeHtml(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
