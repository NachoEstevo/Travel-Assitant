import { NextRequest, NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { z } from "zod";

// GET - List all active price alerts
export async function GET() {
  const authenticated = await isAuthenticated();
  if (!authenticated) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const prisma = getDb();
    const alerts = await prisma.priceAlert.findMany({
      where: {
        active: true,
        expiresAt: {
          gt: new Date(),
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      success: true,
      data: alerts,
    });
  } catch (error) {
    console.error("Failed to fetch alerts:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch alerts" },
      { status: 500 }
    );
  }
}

// POST - Create a new price alert
const createAlertSchema = z.object({
  origin: z.string().length(3),
  destination: z.string().length(3),
  departureDate: z.string(), // ISO date string
  returnDate: z.string().optional(),
  targetPrice: z.number().positive(),
  currentPrice: z.number().positive(),
  currency: z.string().default("USD"),
  flightId: z.string().optional(),
  airlines: z.array(z.string()).default([]),
});

export async function POST(request: NextRequest) {
  const authenticated = await isAuthenticated();
  if (!authenticated) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const prisma = getDb();
    const body = await request.json();
    const data = createAlertSchema.parse(body);

    // Check for existing alert on same route/date
    const existing = await prisma.priceAlert.findFirst({
      where: {
        origin: data.origin,
        destination: data.destination,
        departureDate: new Date(data.departureDate),
        active: true,
      },
    });

    if (existing) {
      // Update existing alert with new target price
      const updated = await prisma.priceAlert.update({
        where: { id: existing.id },
        data: {
          targetPrice: data.targetPrice,
          currentPrice: data.currentPrice,
          airlines: data.airlines,
        },
      });

      return NextResponse.json({
        success: true,
        data: updated,
        message: "Alert updated",
      });
    }

    // Create new alert
    const departureDate = new Date(data.departureDate);
    const alert = await prisma.priceAlert.create({
      data: {
        origin: data.origin,
        destination: data.destination,
        departureDate,
        returnDate: data.returnDate ? new Date(data.returnDate) : null,
        targetPrice: data.targetPrice,
        currentPrice: data.currentPrice,
        currency: data.currency,
        flightId: data.flightId,
        airlines: data.airlines,
        expiresAt: departureDate, // Alert expires on departure date
      },
    });

    return NextResponse.json({
      success: true,
      data: alert,
      message: "Alert created",
    });
  } catch (error) {
    console.error("Failed to create alert:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: "Invalid request data", details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: "Failed to create alert" },
      { status: 500 }
    );
  }
}

// DELETE - Delete an alert
export async function DELETE(request: NextRequest) {
  const authenticated = await isAuthenticated();
  if (!authenticated) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const prisma = getDb();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Alert ID required" },
        { status: 400 }
      );
    }

    await prisma.priceAlert.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: "Alert deleted",
    });
  } catch (error) {
    console.error("Failed to delete alert:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete alert" },
      { status: 500 }
    );
  }
}
