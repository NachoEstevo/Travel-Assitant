import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { isAuthenticated } from "@/lib/auth";
import { isAmadeusConfigured } from "@/lib/amadeus";
import { searchMultiCityRoutes, MultiCitySearchResult } from "@/lib/multi-city";

// Request validation schema
const compareRoutesSchema = z.object({
  origin: z.string().length(3, "Origin must be a 3-letter IATA code").toUpperCase(),
  destination: z.string().length(3, "Destination must be a 3-letter IATA code").toUpperCase(),
  departureDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
  returnDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD").optional(),
  adults: z.number().int().min(1).max(9).default(1),
  travelClass: z.enum(["ECONOMY", "PREMIUM_ECONOMY", "BUSINESS", "FIRST"]).default("ECONOMY"),
  maxHubs: z.number().int().min(1).max(5).default(3),
});

export interface CompareRoutesSuccessResponse {
  success: true;
  data: MultiCitySearchResult;
}

export interface CompareRoutesErrorResponse {
  success: false;
  error: string;
  details?: unknown;
}

export type CompareRoutesResponse = CompareRoutesSuccessResponse | CompareRoutesErrorResponse;

export async function POST(request: NextRequest): Promise<NextResponse<CompareRoutesResponse>> {
  try {
    // Check authentication
    const authenticated = await isAuthenticated();
    if (!authenticated) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Check Amadeus configuration
    if (!isAmadeusConfigured()) {
      return NextResponse.json(
        { success: false, error: "Flight search service not configured" },
        { status: 503 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validationResult = compareRoutesSchema.safeParse(body);

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

    const params = validationResult.data;

    // Perform multi-city route search
    const result = await searchMultiCityRoutes({
      origin: params.origin,
      destination: params.destination,
      departureDate: params.departureDate,
      returnDate: params.returnDate,
      adults: params.adults,
      travelClass: params.travelClass,
      maxHubs: params.maxHubs,
    });

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Compare routes error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to compare routes",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
