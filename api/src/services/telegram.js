import { Telegraf } from 'telegraf';
import cron from 'node-cron';
import Sale from '../models/Sale.js';

// 1. Initialize Bot First
const botToken = process.env.TELEGRAM_BOT_TOKEN;
const chatIds = (process.env.TELEGRAM_CHAT_ID || '')
  .split(',')
  .map((id) => id.trim())
  .filter(Boolean);
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

function escapeHtml(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Build a product-summary message.
 */
function buildProductSummaryMessage(report, sym) {
  const breakdown = report?.breakdown || [];
  if (breakdown.length === 0) {
    return '📦 <b>Products Sold Summary</b>\n--------------------------------\nNo products sold.';
  }

  const lines = [
    '📦 <b>PRODUCTS SOLD SUMMARY</b>',
    '--------------------------------',
  ];

  for (const item of breakdown) {
    lines.push(
      `• ${escapeHtml(item.product?.name || 'Unknown Product')}: ${item.quantity} pcs — ${sym}${(item.value || 0).toFixed(2)}`
    );
  }

  return lines.join('\n');
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

    // Use the sale's stored rates to compute each item's USD value
    const safeRates = {
      eur: sale.rates?.eur > 0 ? sale.rates.eur : 1,
      usd: sale.rates?.usd > 0 ? sale.rates.usd : 1,
      birr: sale.rates?.birr > 0 ? sale.rates.birr : 1,
      visa: sale.rates?.visa > 0 ? sale.rates.visa : 1,
    };

    for (const item of sale.items || []) {
      const qty = item.quantity || 0;
      totalSalesItems += qty;
      const pName = item.item_id?.name || 'Unknown Product';
      const pId = item.item_id?._id?.toString() || '—';

      const itemValueUSD =
        (item.eur || 0) / safeRates.eur +
        (item.usd || 0) / safeRates.usd +
        (item.birr || 0) / safeRates.birr +
        (item.visa || 0) / safeRates.visa;

      const existing = productMap.get(pId) || { product: { _id: pId, name: pName }, quantity: 0, value: 0 };
      existing.quantity += qty;
      existing.value += itemValueUSD;
      productMap.set(pId, existing);

      transactionItems.push({
        product: { _id: pId, name: pName },
        quantity: qty,
        value: itemValueUSD,
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
 * Send report for a specific date (YYYY-MM-DD).
 * If no date is provided, uses today's Ethiopian date.
 */
export async function sendDailyReportForDate(reportDateStr) {
  if (!bot || chatIds.length === 0) {
    console.log('[cron] Skipping report dispatch: Bot or Chat ID missing');
    return;
  }

  const dateStr = reportDateStr || getEthiopianDateString();

  try {
    console.log(`[cron] Compiling daily sales report for ${dateStr}...`);

    const reportData = await generateDailyReportData(dateStr);
    const sym = getServerCurrencySymbol(reportData.currency);

    const textSummaryMessage = [
      '📊 <b>DAILY SALES REPORT (EAT)</b>',
      `📅 Date: <b>${dateStr}</b>`,
      '--------------------------------',
      `💰 <b>Total Sales:</b> ${sym}${(reportData.summary.totalValue || 0).toFixed(2)}`,
      `🧾 <b>Total Orders:</b> ${reportData.summary.totalRecords}`,
      `📦 <b>Total Items Sold:</b> ${reportData.summary.totalItems}`,
    ].join('\n');

    const productSummary = buildProductSummaryMessage(reportData, sym);

    for (const chatId of chatIds) {
      // 1. Summary
      await bot.telegram.sendMessage(chatId, textSummaryMessage, { parse_mode: 'HTML' });

      // 2. Product summary
      await bot.telegram.sendMessage(chatId, productSummary, { parse_mode: 'HTML' });
    }

    console.log('[cron] Automated dispatch successfully completed.');
  } catch (err) {
    console.error('[cron] Automated dispatch crashed:', err.message);
    throw err;
  }
}

/**
 * Main automated task scheduler — reports on the day that just ended.
 */
export async function sendDailyReport() {
  const todayStr = getEthiopianDateString();
  // Cron runs at 00:00, so report on the day that just ended
  const [y, m, d] = todayStr.split('-').map(Number);
  const yesterday = new Date(Date.UTC(y, m - 1, d - 1));
  const reportDateStr = yesterday.toISOString().slice(0, 10);

  await sendDailyReportForDate(reportDateStr);
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
  if (!bot || chatIds.length === 0) {
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
    for (const chatId of chatIds) {
      await bot.telegram.sendMessage(chatId, message, { parse_mode: 'HTML' });
    }
    console.log('[telegram] Sale notification sent for invoice:', sale.invoiceNumber);
  } catch (err) {
    console.error('[telegram] Failed to send sale notification:', err.message);
  }
}
