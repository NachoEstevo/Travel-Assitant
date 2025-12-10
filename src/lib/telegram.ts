/**
 * Telegram Bot Service
 *
 * Sends notifications via Telegram Bot API.
 * No external dependencies - uses native fetch.
 */

const TELEGRAM_API_BASE = "https://api.telegram.org";

interface TelegramResponse {
  ok: boolean;
  result?: unknown;
  description?: string;
}

/**
 * Get the bot token from environment
 */
function getBotToken(): string | null {
  return process.env.TELEGRAM_BOT_TOKEN || null;
}

/**
 * Get the chat ID to send messages to
 */
function getChatId(): string | null {
  return process.env.TELEGRAM_CHAT_ID || null;
}

/**
 * Check if Telegram is configured
 */
export function isTelegramConfigured(): boolean {
  return !!(getBotToken() && getChatId());
}

/**
 * Send a message via Telegram
 */
export async function sendTelegramMessage(
  text: string,
  parseMode: "HTML" | "Markdown" = "HTML"
): Promise<{ success: boolean; error?: string }> {
  const botToken = getBotToken();
  const chatId = getChatId();

  if (!botToken || !chatId) {
    return { success: false, error: "Telegram not configured" };
  }

  try {
    const url = `${TELEGRAM_API_BASE}/bot${botToken}/sendMessage`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: parseMode,
        disable_web_page_preview: true,
      }),
    });

    const data: TelegramResponse = await response.json();

    if (!data.ok) {
      console.error("Telegram API error:", data.description);
      return { success: false, error: data.description || "Unknown error" };
    }

    return { success: true };
  } catch (error) {
    console.error("Failed to send Telegram message:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export interface TelegramPriceAlertData {
  taskName: string;
  origin: string;
  destination: string;
  departureDate: string;
  returnDate?: string | null;
  currentPrice: number;
  previousPrice?: number;
  lowestPrice?: number;
  priceTarget?: number | null;
  currency: string;
  airlines: string[];
  isNewLow: boolean;
  hitPriceTarget: boolean;
}

/**
 * Send a price alert via Telegram
 */
export async function sendTelegramPriceAlert(
  data: TelegramPriceAlertData
): Promise<{ success: boolean; error?: string }> {
  const message = buildPriceAlertMessage(data);
  return sendTelegramMessage(message, "HTML");
}

/**
 * Build a formatted price alert message for Telegram
 */
function buildPriceAlertMessage(data: TelegramPriceAlertData): string {
  const route = `${data.origin} → ${data.destination}`;
  const price = `$${Math.round(data.currentPrice)}`;

  // Header with alert type
  let header: string;
  if (data.hitPriceTarget) {
    header = `🎯 <b>TARGET PRICE HIT!</b>`;
  } else if (data.isNewLow) {
    header = `📉 <b>NEW LOW PRICE!</b>`;
  } else if (data.previousPrice && data.currentPrice < data.previousPrice) {
    header = `💰 <b>PRICE DROP!</b>`;
  } else {
    header = `✈️ <b>Price Update</b>`;
  }

  // Build message parts
  const parts: string[] = [
    header,
    "",
    `<b>${data.taskName}</b>`,
    `${route}`,
    "",
    `💵 <b>${price}</b> ${data.currency}`,
  ];

  // Add price comparison
  if (data.previousPrice && data.currentPrice < data.previousPrice) {
    const savings = Math.round(data.previousPrice - data.currentPrice);
    parts.push(`📊 Was $${Math.round(data.previousPrice)} (Save $${savings})`);
  }

  if (data.lowestPrice && data.lowestPrice < data.currentPrice) {
    parts.push(`📉 Lowest seen: $${Math.round(data.lowestPrice)}`);
  }

  if (data.priceTarget) {
    const targetStatus = data.hitPriceTarget ? "✅" : "⏳";
    parts.push(`${targetStatus} Target: $${data.priceTarget}`);
  }

  // Add trip details
  parts.push("");
  parts.push(`📅 ${data.departureDate}${data.returnDate ? ` - ${data.returnDate}` : " (One way)"}`);

  if (data.airlines.length > 0) {
    parts.push(`🛫 ${data.airlines.join(", ")}`);
  }

  return parts.join("\n");
}

/**
 * Test the Telegram connection by sending a test message
 */
export async function testTelegramConnection(): Promise<{ success: boolean; error?: string }> {
  return sendTelegramMessage(
    "✅ <b>PersonalTravel Connected!</b>\n\nYou will receive price alerts here.",
    "HTML"
  );
}
