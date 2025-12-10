/**
 * Resend Email Service
 *
 * Handles sending email notifications for price alerts and updates.
 */

import { Resend } from "resend";

// Lazy-load Resend client
let _resend: Resend | null = null;

function getResend(): Resend {
  if (!_resend) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error("RESEND_API_KEY environment variable is not set");
    }
    _resend = new Resend(apiKey);
  }
  return _resend;
}

// Default sender email
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "PersonalTravel <notifications@resend.dev>";
const TO_EMAIL = process.env.NOTIFICATION_EMAIL || "";

export interface PriceAlertData {
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
 * Send a price alert email
 */
export async function sendPriceAlertEmail(data: PriceAlertData): Promise<{ success: boolean; error?: string }> {
  if (!TO_EMAIL) {
    console.log("No notification email configured, skipping email notification");
    return { success: false, error: "No notification email configured" };
  }

  try {
    const resend = getResend();

    const subject = buildSubject(data);
    const html = buildPriceAlertHtml(data);

    const result = await resend.emails.send({
      from: FROM_EMAIL,
      to: TO_EMAIL,
      subject,
      html,
    });

    if (result.error) {
      console.error("Resend error:", result.error);
      return { success: false, error: result.error.message };
    }

    console.log(`Email sent successfully: ${result.data?.id}`);
    return { success: true };
  } catch (error) {
    console.error("Failed to send email:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

function buildSubject(data: PriceAlertData): string {
  const route = `${data.origin} → ${data.destination}`;

  if (data.hitPriceTarget) {
    return `Price Alert: ${route} hit your target of $${data.priceTarget}!`;
  }

  if (data.isNewLow) {
    return `New Low Price: ${route} is now $${Math.round(data.currentPrice)}`;
  }

  if (data.previousPrice && data.currentPrice < data.previousPrice) {
    const drop = Math.round(data.previousPrice - data.currentPrice);
    return `Price Drop: ${route} down $${drop} to $${Math.round(data.currentPrice)}`;
  }

  return `Price Update: ${route} - $${Math.round(data.currentPrice)}`;
}

function buildPriceAlertHtml(data: PriceAlertData): string {
  const priceChangeHtml = data.previousPrice
    ? `
      <tr>
        <td style="padding: 8px 0; color: #666;">Previous Price</td>
        <td style="padding: 8px 0; text-align: right; text-decoration: line-through; color: #999;">$${Math.round(data.previousPrice)}</td>
      </tr>
    `
    : "";

  const savingsHtml =
    data.previousPrice && data.currentPrice < data.previousPrice
      ? `
      <tr>
        <td style="padding: 8px 0; color: #666;">You Save</td>
        <td style="padding: 8px 0; text-align: right; color: #16a34a; font-weight: 600;">$${Math.round(data.previousPrice - data.currentPrice)}</td>
      </tr>
    `
      : "";

  const targetHtml = data.priceTarget
    ? `
      <tr>
        <td style="padding: 8px 0; color: #666;">Your Target</td>
        <td style="padding: 8px 0; text-align: right; ${data.hitPriceTarget ? "color: #16a34a; font-weight: 600;" : ""}">$${data.priceTarget}</td>
      </tr>
    `
    : "";

  const lowestHtml = data.lowestPrice
    ? `
      <tr>
        <td style="padding: 8px 0; color: #666;">Lowest Seen</td>
        <td style="padding: 8px 0; text-align: right; color: #16a34a;">$${Math.round(data.lowestPrice)}</td>
      </tr>
    `
    : "";

  const alertBanner = data.hitPriceTarget
    ? `
      <div style="background: linear-gradient(135deg, #16a34a, #22c55e); color: white; padding: 20px; text-align: center; border-radius: 8px; margin-bottom: 24px;">
        <div style="font-size: 24px; margin-bottom: 8px;">Target Price Hit!</div>
        <div style="font-size: 14px; opacity: 0.9;">Your flight is now at or below your target price</div>
      </div>
    `
    : data.isNewLow
    ? `
      <div style="background: linear-gradient(135deg, #2563eb, #3b82f6); color: white; padding: 20px; text-align: center; border-radius: 8px; margin-bottom: 24px;">
        <div style="font-size: 24px; margin-bottom: 8px;">New Lowest Price!</div>
        <div style="font-size: 14px; opacity: 0.9;">This is the lowest price we've seen for this route</div>
      </div>
    `
    : "";

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f5f5f5;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <div style="background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
      <!-- Header -->
      <div style="background: #0f172a; padding: 24px; text-align: center;">
        <h1 style="margin: 0; color: white; font-size: 20px; font-weight: 600;">PersonalTravel</h1>
      </div>

      <!-- Content -->
      <div style="padding: 32px;">
        ${alertBanner}

        <!-- Task Name -->
        <h2 style="margin: 0 0 24px 0; font-size: 18px; color: #0f172a;">${data.taskName}</h2>

        <!-- Route -->
        <div style="background: #f8fafc; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
          <div style="display: flex; align-items: center; justify-content: center; gap: 16px;">
            <div style="text-align: center;">
              <div style="font-size: 28px; font-weight: 700; color: #0f172a;">${data.origin}</div>
            </div>
            <div style="font-size: 24px; color: #94a3b8;">→</div>
            <div style="text-align: center;">
              <div style="font-size: 28px; font-weight: 700; color: #0f172a;">${data.destination}</div>
            </div>
          </div>
          <div style="text-align: center; margin-top: 12px; color: #64748b; font-size: 14px;">
            ${data.departureDate}${data.returnDate ? ` — ${data.returnDate}` : " (One Way)"}
          </div>
        </div>

        <!-- Current Price -->
        <div style="text-align: center; margin-bottom: 24px;">
          <div style="font-size: 48px; font-weight: 700; color: #0f172a;">$${Math.round(data.currentPrice)}</div>
          <div style="color: #64748b; font-size: 14px;">${data.currency}</div>
        </div>

        <!-- Details -->
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          ${priceChangeHtml}
          ${savingsHtml}
          ${targetHtml}
          ${lowestHtml}
          <tr>
            <td style="padding: 8px 0; color: #666;">Airlines</td>
            <td style="padding: 8px 0; text-align: right;">${data.airlines.join(", ")}</td>
          </tr>
        </table>
      </div>

      <!-- Footer -->
      <div style="background: #f8fafc; padding: 20px; text-align: center; font-size: 12px; color: #64748b;">
        <p style="margin: 0;">This is an automated price alert from PersonalTravel.</p>
        <p style="margin: 8px 0 0 0;">Prices change frequently. Book soon if this works for you!</p>
      </div>
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * Check if email notifications are configured
 */
export function isEmailConfigured(): boolean {
  return !!(process.env.RESEND_API_KEY && process.env.NOTIFICATION_EMAIL);
}
