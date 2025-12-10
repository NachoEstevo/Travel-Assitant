import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { searchAirports, isAmadeusConfigured, AirportSuggestion } from "@/lib/amadeus";
import { isAuthenticated } from "@/lib/auth";

const querySchema = z.object({
  q: z.string().min(2, "Search query must be at least 2 characters"),
});

export interface AirportSearchResponse {
  success: boolean;
  data?: Array<{
    code: string;
    name: string;
    city: string;
    country: string;
    type: string;
  }>;
  error?: string;
}

export async function GET(request: NextRequest): Promise<NextResponse<AirportSearchResponse>> {
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
        { success: false, error: "Airport search service not configured" },
        { status: 503 }
      );
    }

    // Parse query params
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q");

    const validationResult = querySchema.safeParse({ q: query });
    if (!validationResult.success) {
      return NextResponse.json(
        { success: false, error: "Invalid query" },
        { status: 400 }
      );
    }

    // Search airports via Amadeus
    const airports = await searchAirports(validationResult.data.q);

    // Transform to simplified format
    const simplified = airports.map((airport: AirportSuggestion) => ({
      code: airport.iataCode,
      name: airport.name,
      city: airport.address.cityName,
      country: airport.address.countryName,
      type: airport.subType === "AIRPORT" ? "airport" : "city",
    }));

    return NextResponse.json({
      success: true,
      data: simplified,
    });
  } catch (error) {
    console.error("Airport search error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to search airports",
      },
      { status: 500 }
    );
  }
}
