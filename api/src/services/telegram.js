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
 * Build a detailed plain-text message from the daily report data.
 * Telegram messages have a max length of 4096 characters.
 */
function buildDetailedReportMessages(report, sym) {
  const transactions = report?.transactions || [];

  if (transactions.length === 0) {
    return ['📭 No sales transactions found for this day.'];
  }

  const header = [
    '📋 <b>DETAILED SALES REPORT</b>',
    '--------------------------------',
  ].join('\n');

  const chunks = [];
  let current = header;

  for (const t of transactions) {
    const itemsText = (t.items || [])
      .map((item) => `  • ${escapeHtml(item.product?.name || 'Unknown Product')} × ${item.quantity}`)
      .join('\n');

    const dateStr = t.date
      ? new Date(t.date).toLocaleString('en-US', {
          year: 'numeric',
          month: 'short',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          timeZone: 'Africa/Addis_Ababa',
        })
      : '—';

    const block = [
      '',
      `🧾 <b>Invoice:</b> ${escapeHtml(t.invoiceNumber || '—')}`,
      `🏪 <b>Store:</b> ${escapeHtml(t.storeName || '—')}`,
      `👤 <b>Sales Person:</b> ${escapeHtml(t.salesName || 'N/A')}`,
      `🙋 <b>Customer:</b> ${escapeHtml(t.customerName || 'N/A')}`,
      `📅 <b>Date:</b> ${dateStr}`,
      '<b>Items:</b>',
      itemsText || '  • No items',
      `💰 <b>Total:</b> ${sym}${(t.totalAmount || 0).toFixed(2)}`,
      '--------------------------------',
    ].join('\n');

    // Telegram max message length is 4096; keep a small margin
    if (current.length + block.length > 4000) {
      chunks.push(current);
      current = block;
    } else {
      current += block;
    }
  }

  if (current) {
    chunks.push(current);
  }

  return chunks;
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
  if (!bot || chatIds.length === 0) {
    console.log('[cron] Skipping report dispatch: Bot or Chat ID missing');
    return;
  }

  try {
    console.log('[cron] Compiling detailed daily sales report...');
    const todayStr = getEthiopianDateString();

    // Cron runs at 00:00, so report on the day that just ended
    const [y, m, d] = todayStr.split('-').map(Number);
    const yesterday = new Date(Date.UTC(y, m - 1, d - 1));
    const reportDateStr = yesterday.toISOString().slice(0, 10);

    const reportData = await generateDailyReportData(reportDateStr);
    const sym = getServerCurrencySymbol(reportData.currency);

    const textSummaryMessage = [
      '📊 <b>DAILY SALES REPORT (EAT)</b>',
      `📅 Date: <b>${reportDateStr}</b>`,
      '--------------------------------',
      `💰 <b>Total Sales:</b> ${sym}${(reportData.summary.totalValue || 0).toFixed(2)}`,
      `🧾 <b>Total Orders:</b> ${reportData.summary.totalRecords}`,
      `📦 <b>Total Items Sold:</b> ${reportData.summary.totalItems}`,
    ].join('\n');

    const detailMessages = buildDetailedReportMessages(reportData, sym);
    const productSummary = buildProductSummaryMessage(reportData, sym);

    for (const chatId of chatIds) {
      // 1. Summary
      await bot.telegram.sendMessage(chatId, textSummaryMessage, { parse_mode: 'HTML' });

      // 2. Detailed transactions (split across multiple messages if needed)
      for (const msg of detailMessages) {
        await bot.telegram.sendMessage(chatId, msg, { parse_mode: 'HTML' });
      }

      // 3. Product summary
      await bot.telegram.sendMessage(chatId, productSummary, { parse_mode: 'HTML' });
    }

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
