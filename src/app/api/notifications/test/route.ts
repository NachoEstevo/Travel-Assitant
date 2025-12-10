import { NextRequest, NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { isEmailConfigured, sendPriceAlertEmail } from "@/lib/resend";
import { isTelegramConfigured, testTelegramConnection } from "@/lib/telegram";

// POST - Send a test notification
export async function POST(request: NextRequest) {
  try {
    const authenticated = await isAuthenticated();
    if (!authenticated) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { channel } = body as { channel?: "email" | "telegram" | "all" };

    const results: { channel: string; success: boolean; error?: string }[] = [];

    // Test email
    if (channel === "email" || channel === "all") {
      if (isEmailConfigured()) {
        const testData = {
          taskName: "Test Notification",
          origin: "JFK",
          destination: "LHR",
          departureDate: "2025-03-15",
          returnDate: "2025-03-22",
          currentPrice: 450,
          previousPrice: 520,
          lowestPrice: 450,
          priceTarget: 500,
          currency: "USD",
          airlines: ["British Airways"],
          isNewLow: true,
          hitPriceTarget: true,
        };
        const emailResult = await sendPriceAlertEmail(testData);
        results.push({
          channel: "email",
          success: emailResult.success,
          error: emailResult.error,
        });
      } else {
        results.push({
          channel: "email",
          success: false,
          error: "Email not configured. Set RESEND_API_KEY and NOTIFICATION_EMAIL.",
        });
      }
    }

    // Test Telegram
    if (channel === "telegram" || channel === "all") {
      if (isTelegramConfigured()) {
        const telegramResult = await testTelegramConnection();
        results.push({
          channel: "telegram",
          success: telegramResult.success,
          error: telegramResult.error,
        });
      } else {
        results.push({
          channel: "telegram",
          success: false,
          error: "Telegram not configured. Set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID.",
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: results,
    });
  } catch (error) {
    console.error("Test notification error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to send test notification" },
      { status: 500 }
    );
  }
}

// GET - Check notification configuration status
export async function GET() {
  try {
    const authenticated = await isAuthenticated();
    if (!authenticated) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json({
      success: true,
      data: {
        email: {
          configured: isEmailConfigured(),
          recipient: process.env.NOTIFICATION_EMAIL ? maskEmail(process.env.NOTIFICATION_EMAIL) : null,
        },
        telegram: {
          configured: isTelegramConfigured(),
          chatId: process.env.TELEGRAM_CHAT_ID ? `...${process.env.TELEGRAM_CHAT_ID.slice(-4)}` : null,
        },
      },
    });
  } catch (error) {
    console.error("Get notification status error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to get notification status" },
      { status: 500 }
    );
  }
}

function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!domain) return email;
  const maskedLocal = local.length > 2 ? local[0] + "***" + local.slice(-1) : "***";
  return `${maskedLocal}@${domain}`;
}
