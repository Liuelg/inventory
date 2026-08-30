import { Telegraf } from 'telegraf';
import cron from 'node-cron';
import Sale from '../models/Sale.js';
import Store from '../models/Stores.js';

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
    case 'birr': return 'Br';
    case 'eur': return '€';
    case 'gbp': return '£';
    case 'visa': return 'Visa $';
    case 'usd': return '$';
    default: return '$';
  }
}

function convertUSDToCurrency(amountUSD, targetCurrency, rates) {
  const safeRates = {
    eur: rates?.eur > 0 ? rates.eur : 1,
    usd: rates?.usd > 0 ? rates.usd : 1,
    birr: rates?.birr > 0 ? rates.birr : 1,
    visa: rates?.visa > 0 ? rates.visa : 1,
    gbp: rates?.gbp > 0 ? rates.gbp : 1,
  };
  return amountUSD * (safeRates[targetCurrency] || 1);
}

function escapeHtml(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Build a product-summary message for a single store report.
 */
function buildStoreProductSummary(storeName, breakdown, sym) {
  if (breakdown.length === 0) {
    return `📦 <b>Products Sold — ${escapeHtml(storeName)}</b>\n--------------------------------\nNo products sold.`;
  }

  const lines = [
    `📦 <b>PRODUCTS SOLD — ${escapeHtml(storeName.toUpperCase())}</b>`,
    '--------------------------------',
  ];

  for (const item of breakdown) {
    const unitPrice = item.quantity > 0 ? (item.value || 0) / item.quantity : 0;
    lines.push(
      `• ${escapeHtml(item.product?.name || 'Unknown Product')}(${sym}${unitPrice.toFixed(2)}): ${item.quantity} pcs — ${sym}${(item.value || 0).toFixed(2)}`
    );
  }

  return lines.join('\n');
}

/**
 * Build a store summary message.
 */
function buildStoreSummaryMessage(dateStr, storeName, summary, sym) {
  return [
    '📊 <b>DAILY SALES REPORT (EAT)</b>',
    `🏪 <b>Store:</b> ${escapeHtml(storeName)}`,
    `📅 Date: <b>${dateStr}</b>`,
    '--------------------------------',
    `💰 <b>Total Sales:</b> ${sym}${(summary.totalValue || 0).toFixed(2)}`,
    `🧾 <b>Total Orders:</b> ${summary.totalRecords}`,
    `📦 <b>Total Items Sold:</b> ${summary.totalItems}`,
  ].join('\n');
}

/**
 * Build overall summary across all stores.
 */
function buildOverallSummaryMessage(dateStr, storeSummaries, sym) {
  const totalValue = storeSummaries.reduce((sum, s) => sum + (s.totalValue || 0), 0);
  const totalRecords = storeSummaries.reduce((sum, s) => sum + (s.totalRecords || 0), 0);
  const totalItems = storeSummaries.reduce((sum, s) => sum + (s.totalItems || 0), 0);

  const lines = [
    '📊 <b>OVERALL DAILY SALES REPORT (EAT)</b>',
    `📅 Date: <b>${dateStr}</b>`,
    '--------------------------------',
    `💰 <b>Total Sales (All Stores):</b> ${sym}${totalValue.toFixed(2)}`,
    `🧾 <b>Total Orders (All Stores):</b> ${totalRecords}`,
    `📦 <b>Total Items Sold (All Stores):</b> ${totalItems}`,
    '',
    '<b>Per-Store Breakdown:</b>',
  ];

  for (const s of storeSummaries) {
    lines.push(
      `• ${escapeHtml(s.storeName)}: ${sym}${(s.totalValue || 0).toFixed(2)} — ${s.totalRecords} orders — ${s.totalItems} items`
    );
  }

  return lines.join('\n');
}

/**
 * Process sales for a single store and return summary + breakdown.
 */
function processStoreSales(sales, storeId) {
  const storeSales = sales.filter((s) => {
    const sId = s.store?._id?.toString?.() || s.store?.toString?.();
    return sId === storeId;
  });

  const productMap = new Map();
  let totalSalesValue = 0;
  let totalSalesItems = 0;

  for (const sale of storeSales) {
    totalSalesValue += sale.totalAmount || 0;

    const safeRates = {
      eur: sale.rates?.eur > 0 ? sale.rates.eur : 1,
      usd: sale.rates?.usd > 0 ? sale.rates.usd : 1,
      birr: sale.rates?.birr > 0 ? sale.rates.birr : 1,
      visa: sale.rates?.visa > 0 ? sale.rates.visa : 1,
      gbp: sale.rates?.gbp > 0 ? sale.rates.gbp : 1,
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
        (item.visa || 0) / safeRates.visa +
        (item.gbp || 0) / safeRates.gbp;

      const existing = productMap.get(pId) || { product: { _id: pId, name: pName }, quantity: 0, value: 0 };
      existing.quantity += qty;
      existing.value += itemValueUSD;
      productMap.set(pId, existing);
    }
  }

  return {
    totalRecords: storeSales.length,
    totalItems: totalSalesItems,
    totalValue: totalSalesValue,
    breakdown: Array.from(productMap.values()),
  };
}

/**
 * Send report for a specific date (YYYY-MM-DD).
 * Sends one report per store, plus an overall summary.
 */
export async function sendDailyReportForDate(reportDateStr) {
  if (!bot || chatIds.length === 0) {
    console.log('[cron] Skipping report dispatch: Bot or Chat ID missing');
    return;
  }

  const dateStr = reportDateStr || getEthiopianDateString();

  try {
    console.log(`[cron] Compiling daily sales report for ${dateStr}...`);

    const [year, month, day] = dateStr.split('-').map(Number);
    const baseUtcMidnight = new Date(Date.UTC(year, month - 1, day));
    const startRange = new Date(baseUtcMidnight.getTime() - (180 * 60000));
    const endRange = new Date(baseUtcMidnight.getTime() - (180 * 60000) + (24 * 60 * 60 * 1000));

    // Fetch all sales for the date with store populated
    const todaysSales = await Sale.find({
      date_time: { $gte: startRange, $lt: endRange }
    }).populate('items.item_id', 'name').populate('store', 'name defaultCurrency');

    if (todaysSales.length === 0) {
      console.log(`[cron] No sales found for ${dateStr}. Skipping report.`);
      return;
    }

    // Group sales by store
    const salesByStore = new Map();
    for (const sale of todaysSales) {
      const storeId = sale.store?._id?.toString?.() || sale.store?.toString?.();
      const storeName = sale.store?.name || 'Unknown Store';
      const storeCurrency = sale.store?.defaultCurrency || 'usd';
      if (!storeId) continue;
      if (!salesByStore.has(storeId)) {
        salesByStore.set(storeId, { storeId, storeName, storeCurrency, sales: [] });
      }
      salesByStore.get(storeId).sales.push(sale);
    }

    const storeSummaries = [];

    // Process each store's report
    for (const [storeId, { storeName, storeCurrency, sales }] of salesByStore) {
      const report = processStoreSales(sales, storeId);
      const sym = getServerCurrencySymbol(storeCurrency);

      // Convert totals and breakdown to store's default currency
      const convertedTotal = convertUSDToCurrency(
        report.totalValue,
        storeCurrency,
        sales[0]?.rates || {}
      );
      const convertedBreakdown = report.breakdown.map((item) => ({
        ...item,
        value: convertUSDToCurrency(item.value, storeCurrency, sales[0]?.rates || {}),
      }));

      const convertedReport = {
        ...report,
        totalValue: convertedTotal,
        breakdown: convertedBreakdown,
      };

      storeSummaries.push({ storeName, storeCurrency, ...convertedReport });

      const summaryMsg = buildStoreSummaryMessage(dateStr, storeName, convertedReport, sym);
      const productMsg = buildStoreProductSummary(storeName, convertedBreakdown, sym);

      for (const chatId of chatIds) {
        await bot.telegram.sendMessage(chatId, summaryMsg, { parse_mode: 'HTML' });
        await bot.telegram.sendMessage(chatId, productMsg, { parse_mode: 'HTML' });
      }
    }

    // Send overall summary using each store's own currency in the breakdown
    const overallLines = [
      '📊 <b>OVERALL DAILY SALES REPORT (EAT)</b>',
      `📅 Date: <b>${dateStr}</b>`,
      '--------------------------------',
      `🧾 <b>Total Orders (All Stores):</b> ${storeSummaries.reduce((sum, s) => sum + (s.totalRecords || 0), 0)}`,
      `📦 <b>Total Items Sold (All Stores):</b> ${storeSummaries.reduce((sum, s) => sum + (s.totalItems || 0), 0)}`,
      '',
      '<b>Per-Store Breakdown:</b>',
    ];

    for (const s of storeSummaries) {
      const sSym = getServerCurrencySymbol(s.storeCurrency);
      overallLines.push(
        `• ${escapeHtml(s.storeName)}: ${sSym}${(s.totalValue || 0).toFixed(2)} — ${s.totalRecords} orders — ${s.totalItems} items`
      );
    }

    const overallMsg = overallLines.join('\n');
    for (const chatId of chatIds) {
      await bot.telegram.sendMessage(chatId, overallMsg, { parse_mode: 'HTML' });
    }

    console.log(`[cron] Automated dispatch completed for ${salesByStore.size} store(s).`);
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

  const storeCurrency = store?.defaultCurrency || 'usd';
  const sym = getServerCurrencySymbol(storeCurrency);

  const safeRates = {
    eur: sale.rates?.eur > 0 ? sale.rates.eur : 1,
    usd: sale.rates?.usd > 0 ? sale.rates.usd : 1,
    birr: sale.rates?.birr > 0 ? sale.rates.birr : 1,
    visa: sale.rates?.visa > 0 ? sale.rates.visa : 1,
    gbp: sale.rates?.gbp > 0 ? sale.rates.gbp : 1,
  };

  const itemsText = (sale.items || [])
    .map((item) => {
      const name = item.item_id?.name || 'Unknown Product';
      const itemValueUSD =
        (item.eur || 0) / safeRates.eur +
        (item.usd || 0) / safeRates.usd +
        (item.birr || 0) / safeRates.birr +
        (item.visa || 0) / safeRates.visa +
        (item.gbp || 0) / safeRates.gbp;
      const itemTotal = convertUSDToCurrency(itemValueUSD, storeCurrency, sale.rates || {});
      const unitPrice = item.quantity > 0 ? itemTotal / item.quantity : 0;
      return `  • ${escapeHtml(name)}(${sym}${unitPrice.toFixed(2)}) × ${item.quantity} — ${sym}${itemTotal.toFixed(2)}`;
    })
    .join('\n');

  const convertedTotal = convertUSDToCurrency(
    sale.totalAmount || 0,
    storeCurrency,
    sale.rates || {}
  );

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
    `💰 <b>Total Amount:</b> ${sym}${convertedTotal.toFixed(2)}`,
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
