import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  parseTravelQuery,
  lookupAirportCodes,
  resolveParsedDates,
  isOpenAIConfigured,
  ParsedTravelQuery,
  generateSearchInsights,
} from "@/lib/openai";
import { searchFlights, isAmadeusConfigured, NormalizedFlight } from "@/lib/amadeus";
import { db } from "@/lib/db";
import { isAuthenticated } from "@/lib/auth";

// Request validation schema
const requestSchema = z.object({
  query: z.string().min(10, "Please provide more details about your trip"),
});

export interface NaturalSearchSuccessResponse {
  success: true;
  data: {
    searchId: string;
    parsedQuery: ParsedTravelQuery;
    flights: NormalizedFlight[];
    count: number;
    insight?: string;
    dictionaries?: {
      carriers?: Record<string, string>;
      aircraft?: Record<string, string>;
    };
  };
}

export interface NaturalSearchErrorResponse {
  success: false;
  error: string;
  needsClarification?: boolean;
  clarificationQuestions?: string[];
  parsedQuery?: Partial<ParsedTravelQuery>;
}

export type NaturalSearchResponse = NaturalSearchSuccessResponse | NaturalSearchErrorResponse;

export async function POST(request: NextRequest): Promise<NextResponse<NaturalSearchResponse>> {
  try {
    // Check authentication
    const authenticated = await isAuthenticated();
    if (!authenticated) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Check configurations
    if (!isOpenAIConfigured()) {
      return NextResponse.json(
        { success: false, error: "AI service not configured" },
        { status: 503 }
      );
    }

    if (!isAmadeusConfigured()) {
      return NextResponse.json(
        { success: false, error: "Flight search service not configured" },
        { status: 503 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validationResult = requestSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid request",
        },
        { status: 400 }
      );
    }

    const { query } = validationResult.data;

    // Step 1: Parse the natural language query using OpenAI
    console.log("Parsing travel query:", query);
    const parsedQuery = await parseTravelQuery(query);
    console.log("Parsed query:", JSON.stringify(parsedQuery, null, 2));

    // Check if we need clarification
    if (parsedQuery.confidence.needsClarification && parsedQuery.confidence.overall < 0.5) {
      return NextResponse.json({
        success: false,
        error: "I need more information to search for flights",
        needsClarification: true,
        clarificationQuestions: parsedQuery.confidence.clarificationQuestions,
        parsedQuery,
      });
    }

    // Step 2: Resolve airport codes if not provided
    let originCode = parsedQuery.origin.iataCode;
    let destCode = parsedQuery.destination.iataCode;

    if (!originCode || !destCode) {
      const citiesToLookup: string[] = [];
      if (!originCode) citiesToLookup.push(parsedQuery.origin.city);
      if (!destCode) citiesToLookup.push(parsedQuery.destination.city);

      console.log("Looking up airport codes for:", citiesToLookup);
      const airportLookup = await lookupAirportCodes(citiesToLookup);
      console.log("Airport lookup result:", airportLookup);

      for (const airport of airportLookup.airports) {
        if (!originCode && airport.city.toLowerCase() === parsedQuery.origin.city.toLowerCase()) {
          originCode = airport.iataCode;
        }
        if (!destCode && airport.city.toLowerCase() === parsedQuery.destination.city.toLowerCase()) {
          destCode = airport.iataCode;
        }
      }
    }

    // Validate we have both codes
    if (!originCode || !destCode) {
      return NextResponse.json({
        success: false,
        error: `Could not find airport codes for ${!originCode ? parsedQuery.origin.city : ""} ${!destCode ? parsedQuery.destination.city : ""}`.trim(),
        parsedQuery,
      });
    }

    // Step 3: Resolve dates
    const { departureDate, returnDate } = resolveParsedDates(parsedQuery);
    console.log("Resolved dates:", { departureDate, returnDate });

    // Step 4: Create search query record
    const searchQuery = await db.searchQuery.create({
      data: {
        rawPrompt: query,
        parsed: {
          ...parsedQuery,
          resolvedOrigin: originCode,
          resolvedDestination: destCode,
          resolvedDepartureDate: departureDate,
          resolvedReturnDate: returnDate,
        } as object,
      },
    });

    // Step 5: Search flights via Amadeus
    console.log("Searching flights:", {
      origin: originCode,
      destination: destCode,
      departureDate,
      returnDate,
    });

    const { flights, dictionaries } = await searchFlights({
      originLocationCode: originCode,
      destinationLocationCode: destCode,
      departureDate,
      returnDate: parsedQuery.intent.tripType === "one_way" ? undefined : returnDate,
      adults: parsedQuery.passengers.adults,
      children: parsedQuery.passengers.children,
      infants: parsedQuery.passengers.infants,
      travelClass: parsedQuery.preferences.cabinClass,
      nonStop: parsedQuery.preferences.directFlightsOnly,
      maxPrice: parsedQuery.preferences.maxBudget,
      max: 50,
    });

    // Step 6: Store flight results in database
    if (flights.length > 0) {
      await db.flightResult.createMany({
        data: flights.slice(0, 50).map((flight) => ({
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

    // Step 7: Generate insights (non-blocking)
    let insight: string | undefined;
    if (flights.length > 0) {
      const prices = flights.map((f) => f.price);
      const hasDirectFlights = flights.some((f) => f.legs[0].stops === 0);
      insight = await generateSearchInsights(
        query,
        flights.length,
        { min: Math.min(...prices), max: Math.max(...prices) },
        hasDirectFlights
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        searchId: searchQuery.id,
        parsedQuery,
        flights,
        count: flights.length,
        insight,
        dictionaries: {
          carriers: dictionaries?.carriers,
          aircraft: dictionaries?.aircraft,
        },
      },
    });
  } catch (error) {
    console.error("Natural flight search error:", error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to search flights",
      },
      { status: 500 }
    );
  }
}
