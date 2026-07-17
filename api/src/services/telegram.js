import { Telegraf } from 'telegraf';

const botToken = process.env.TELEGRAM_BOT_TOKEN;
const chatId = process.env.TELEGRAM_CHAT_ID;

const bot = botToken ? new Telegraf(botToken) : null;

/**
 * Send a Telegram notification for a new sale.
 *
 * @param {Object} sale - Populated sale document (items.item_id should include product names)
 * @param {Object} store - Populated store document
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
      })
    : new Date().toLocaleString('en-US');

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
