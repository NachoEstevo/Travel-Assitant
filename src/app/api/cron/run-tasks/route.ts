import { NextRequest, NextResponse } from "next/server";
import { runDueTasks } from "@/lib/scheduler";

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

    const results = await runDueTasks();

    // Summary of results
    const summary = {
      total: results.length,
      successful: results.filter((r) => r.success).length,
      failed: results.filter((r) => !r.success).length,
      priceDrops: results.filter((r) => r.priceChange && r.priceChange < 0).length,
      newLows: results.filter((r) => r.isNewLow).length,
      targetsHit: results.filter((r) => r.hitPriceTarget).length,
    };

    return NextResponse.json({
      success: true,
      summary,
      results,
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
