import { NextRequest, NextResponse } from "next/server";
import { runDueTasks, checkPriceAlerts } from "@/lib/scheduler";

// This endpoint can be called by external cron services (Vercel Cron, Railway, etc.)
// For security, we check for a secret token in the Authorization header

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret (set this in your environment variables)
    const cronSecret = process.env.CRON_SECRET;
    const authHeader = request.headers.get("authorization");

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Run scheduled tasks
    const taskResults = await runDueTasks();

    // Check price alerts
    const alertResults = await checkPriceAlerts();

    // Summary of task results
    const taskSummary = {
      total: taskResults.length,
      successful: taskResults.filter((r) => r.success).length,
      failed: taskResults.filter((r) => !r.success).length,
      priceDrops: taskResults.filter((r) => r.priceChange && r.priceChange < 0).length,
      newLows: taskResults.filter((r) => r.isNewLow).length,
      targetsHit: taskResults.filter((r) => r.hitPriceTarget).length,
    };

    // Summary of alert results
    const alertSummary = {
      total: alertResults.length,
      successful: alertResults.filter((r) => r.success).length,
      failed: alertResults.filter((r) => !r.success).length,
      triggered: alertResults.filter((r) => r.triggered).length,
    };

    return NextResponse.json({
      success: true,
      tasks: {
        summary: taskSummary,
        results: taskResults,
      },
      alerts: {
        summary: alertSummary,
        results: alertResults,
      },
    });
  } catch (error) {
    console.error("Cron run-tasks error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to run tasks" },
      { status: 500 }
    );
  }
}

// Also support POST for webhook-style triggers
export async function POST(request: NextRequest) {
  return GET(request);
}
