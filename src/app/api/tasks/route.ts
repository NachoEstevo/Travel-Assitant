import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { isAuthenticated } from "@/lib/auth";
import { getNextRunTime, isValidCron } from "@/lib/scheduler";

// Request validation schema for creating/updating tasks
const taskSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  origin: z.string().length(3, "Origin must be a 3-letter IATA code").toUpperCase(),
  destination: z.string().length(3, "Destination must be a 3-letter IATA code").toUpperCase(),
  departureDate: z.string().min(1, "Departure date is required"),
  returnDate: z.string().optional(),
  adults: z.number().int().min(1).max(9).default(1),
  travelClass: z.enum(["ECONOMY", "PREMIUM_ECONOMY", "BUSINESS", "FIRST"]).default("ECONOMY"),
  cronExpr: z.string().refine(isValidCron, "Invalid cron expression"),
  priceTarget: z.number().positive().optional(),
  active: z.boolean().default(true),
});

// GET - List all tasks
export async function GET(request: NextRequest) {
  try {
    const authenticated = await isAuthenticated();
    if (!authenticated) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const includeHistory = searchParams.get("includeHistory") === "true";
    const activeOnly = searchParams.get("activeOnly") === "true";

    const tasks = await prisma.scheduledTask.findMany({
      where: activeOnly ? { active: true } : undefined,
      include: {
        priceHistory: includeHistory
          ? {
              orderBy: { recordedAt: "desc" },
              take: 30, // Last 30 price points
            }
          : false,
        _count: {
          select: { priceHistory: true, notifications: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      success: true,
      data: tasks,
    });
  } catch (error) {
    console.error("Get tasks error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch tasks" },
      { status: 500 }
    );
  }
}

// POST - Create a new task
export async function POST(request: NextRequest) {
  try {
    const authenticated = await isAuthenticated();
    if (!authenticated) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validationResult = taskSchema.safeParse(body);

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

    // Calculate next run time
    const nextRun = getNextRunTime(data.cronExpr);

    const task = await prisma.scheduledTask.create({
      data: {
        name: data.name,
        origin: data.origin,
        destination: data.destination,
        departureDate: data.departureDate,
        returnDate: data.returnDate,
        adults: data.adults,
        travelClass: data.travelClass,
        cronExpr: data.cronExpr,
        priceTarget: data.priceTarget,
        active: data.active,
        nextRun,
      },
    });

    return NextResponse.json({
      success: true,
      data: task,
    });
  } catch (error) {
    console.error("Create task error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create task" },
      { status: 500 }
    );
  }
}
