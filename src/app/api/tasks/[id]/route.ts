import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { isAuthenticated } from "@/lib/auth";
import { getNextRunTime, isValidCron } from "@/lib/scheduler";

// Update schema
const updateTaskSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  origin: z.string().length(3).toUpperCase().optional(),
  destination: z.string().length(3).toUpperCase().optional(),
  departureDate: z.string().optional(),
  returnDate: z.string().nullable().optional(),
  adults: z.number().int().min(1).max(9).optional(),
  travelClass: z.enum(["ECONOMY", "PREMIUM_ECONOMY", "BUSINESS", "FIRST"]).optional(),
  cronExpr: z.string().refine(isValidCron, "Invalid cron expression").optional(),
  priceTarget: z.number().positive().nullable().optional(),
  active: z.boolean().optional(),
});

interface RouteContext {
  params: Promise<{ id: string }>;
}

// GET - Get a single task with history
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const authenticated = await isAuthenticated();
    if (!authenticated) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;

    const task = await prisma.scheduledTask.findUnique({
      where: { id },
      include: {
        priceHistory: {
          orderBy: { recordedAt: "desc" },
          take: 100,
        },
        notifications: {
          orderBy: { sentAt: "desc" },
          take: 20,
        },
      },
    });

    if (!task) {
      return NextResponse.json(
        { success: false, error: "Task not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: task,
    });
  } catch (error) {
    console.error("Get task error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch task" },
      { status: 500 }
    );
  }
}

// PUT - Update a task
export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const authenticated = await isAuthenticated();
    if (!authenticated) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;
    const body = await request.json();
    const validationResult = updateTaskSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid request",
          details: validationResult.error.flatten(),
        },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    // Check if task exists
    const existingTask = await prisma.scheduledTask.findUnique({
      where: { id },
    });

    if (!existingTask) {
      return NextResponse.json(
        { success: false, error: "Task not found" },
        { status: 404 }
      );
    }

    // Recalculate next run if cron changed
    const nextRun = data.cronExpr ? getNextRunTime(data.cronExpr) : undefined;

    const task = await prisma.scheduledTask.update({
      where: { id },
      data: {
        ...data,
        ...(nextRun && { nextRun }),
      },
    });

    return NextResponse.json({
      success: true,
      data: task,
    });
  } catch (error) {
    console.error("Update task error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update task" },
      { status: 500 }
    );
  }
}

// DELETE - Delete a task
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const authenticated = await isAuthenticated();
    if (!authenticated) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;

    // Check if task exists
    const existingTask = await prisma.scheduledTask.findUnique({
      where: { id },
    });

    if (!existingTask) {
      return NextResponse.json(
        { success: false, error: "Task not found" },
        { status: 404 }
      );
    }

    await prisma.scheduledTask.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: "Task deleted",
    });
  } catch (error) {
    console.error("Delete task error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete task" },
      { status: 500 }
    );
  }
}
