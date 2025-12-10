import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { searchFlights, isAmadeusConfigured, NormalizedFlight } from "@/lib/amadeus";
import { db } from "@/lib/db";
import { isAuthenticated } from "@/lib/auth";

// Request validation schema
const searchSchema = z.object({
  origin: z.string().length(3, "Origin must be a 3-letter IATA code").toUpperCase(),
  destination: z.string().length(3, "Destination must be a 3-letter IATA code").toUpperCase(),
  departureDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
  returnDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD").optional(),
  adults: z.number().int().min(1).max(9).default(1),
  children: z.number().int().min(0).max(9).default(0),
  infants: z.number().int().min(0).max(9).default(0),
  travelClass: z.enum(["ECONOMY", "PREMIUM_ECONOMY", "BUSINESS", "FIRST"]).default("ECONOMY"),
  nonStop: z.boolean().default(false),
  currency: z.string().length(3).default("USD"),
  maxPrice: z.number().positive().optional(),
  maxResults: z.number().int().min(1).max(250).default(50),
});

export type FlightSearchRequest = z.infer<typeof searchSchema>;

export interface FlightSearchSuccessResponse {
  success: true;
  data: {
    searchId: string;
    flights: NormalizedFlight[];
    count: number;
    dictionaries?: {
      carriers?: Record<string, string>;
      aircraft?: Record<string, string>;
    };
  };
}

export interface FlightSearchErrorResponse {
  success: false;
  error: string;
  details?: unknown;
}

export type FlightSearchResponse = FlightSearchSuccessResponse | FlightSearchErrorResponse;

export async function POST(request: NextRequest): Promise<NextResponse<FlightSearchResponse>> {
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
    const validationResult = searchSchema.safeParse(body);

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

    // Create search query record
    const searchQuery = await db.searchQuery.create({
      data: {
        rawPrompt: `${params.origin} to ${params.destination} on ${params.departureDate}${params.returnDate ? ` returning ${params.returnDate}` : ""}`,
        parsed: params as object,
      },
    });

    // Search flights via Amadeus
    const { flights, dictionaries } = await searchFlights({
      originLocationCode: params.origin,
      destinationLocationCode: params.destination,
      departureDate: params.departureDate,
      returnDate: params.returnDate,
      adults: params.adults,
      children: params.children,
      infants: params.infants,
      travelClass: params.travelClass,
      nonStop: params.nonStop,
      currencyCode: params.currency,
      maxPrice: params.maxPrice,
      max: params.maxResults,
    });

    // Store flight results in database
    if (flights.length > 0) {
      await db.flightResult.createMany({
        data: flights.map((flight) => ({
          searchId: searchQuery.id,
          source: "amadeus",
          itinerary: flight.raw as object,
          price: flight.price,
          currency: flight.currency,
          isMultiCity: flight.isMultiCity,
          legs: flight.legs.length,
          origin: flight.legs[0].origin,
          destination: flight.legs[flight.legs.length - 1].destination,
          departureAt: new Date(flight.legs[0].departureAt),
          arrivalAt: new Date(flight.legs[0].arrivalAt),
          stops: flight.legs[0].stops,
          airlines: flight.airlines,
        })),
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        searchId: searchQuery.id,
        flights,
        count: flights.length,
        dictionaries: {
          carriers: dictionaries?.carriers,
          aircraft: dictionaries?.aircraft,
        },
      },
    });
  } catch (error) {
    console.error("Flight search error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to search flights",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
