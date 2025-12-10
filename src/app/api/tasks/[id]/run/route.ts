import { NextRequest, NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { executeTask } from "@/lib/scheduler";

interface RouteContext {
  params: Promise<{ id: string }>;
}

// POST - Manually run a task
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const authenticated = await isAuthenticated();
    if (!authenticated) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;

    const result = await executeTask(id);

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error || "Task execution failed",
        },
        { status: result.error === "Task not found" ? 404 : 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Run task error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to run task" },
      { status: 500 }
    );
  }
}
