import Amadeus from "amadeus";

// Lazy-loaded Amadeus client singleton
let amadeusClient: InstanceType<typeof Amadeus> | null = null;

function getAmadeusClient(): InstanceType<typeof Amadeus> {
  if (!amadeusClient) {
    if (!process.env.AMADEUS_CLIENT_ID || !process.env.AMADEUS_CLIENT_SECRET) {
      throw new AmadeusError("Amadeus credentials not configured");
    }
    const isProd = process.env.AMADEUS_ENV === "production" || process.env.AMADEUS_ENV === "prod";
    console.log(`Initializing Amadeus client (env: ${isProd ? "production" : "test"})`);
    amadeusClient = new Amadeus({
      clientId: process.env.AMADEUS_CLIENT_ID,
      clientSecret: process.env.AMADEUS_CLIENT_SECRET,
      hostname: isProd ? "production" : "test",
    });
  }
  return amadeusClient;
}

// ============================================
// Type Definitions
// ============================================

export interface FlightSearchParams {
  originLocationCode: string; // IATA code
  destinationLocationCode: string; // IATA code
  departureDate: string; // YYYY-MM-DD
  returnDate?: string; // YYYY-MM-DD for round trip
  adults: number;
  children?: number;
  infants?: number;
  travelClass?: "ECONOMY" | "PREMIUM_ECONOMY" | "BUSINESS" | "FIRST";
  nonStop?: boolean;
  currencyCode?: string;
  maxPrice?: number;
  max?: number; // Max results (1-250)
}

export interface FlightSegment {
  departure: {
    iataCode: string;
    terminal?: string;
    at: string; // ISO datetime
  };
  arrival: {
    iataCode: string;
    terminal?: string;
    at: string;
  };
  carrierCode: string;
  number: string;
  aircraft: { code: string };
  operating?: { carrierCode: string };
  duration: string; // ISO 8601 duration (PT2H30M)
  numberOfStops: number;
}

export interface FlightItinerary {
  duration: string;
  segments: FlightSegment[];
}

export interface FlightPrice {
  currency: string;
  total: string;
  base: string;
  fees?: Array<{ amount: string; type: string }>;
  grandTotal: string;
}

export interface FlightOffer {
  type: string;
  id: string;
  source: string;
  instantTicketingRequired: boolean;
  nonHomogeneous: boolean;
  oneWay: boolean;
  lastTicketingDate: string;
  numberOfBookableSeats: number;
  itineraries: FlightItinerary[];
  price: FlightPrice;
  pricingOptions: {
    fareType: string[];
    includedCheckedBagsOnly: boolean;
  };
  validatingAirlineCodes: string[];
  travelerPricings: Array<{
    travelerId: string;
    fareOption: string;
    travelerType: string;
    price: { currency: string; total: string; base: string };
    fareDetailsBySegment: Array<{
      segmentId: string;
      cabin: string;
      fareBasis: string;
      class: string;
      includedCheckedBags?: { weight?: number; weightUnit?: string; quantity?: number };
    }>;
  }>;
}

export interface FlightSearchResponse {
  meta: {
    count: number;
    links?: { self: string };
  };
  data: FlightOffer[];
  dictionaries?: {
    locations?: Record<string, { cityCode: string; countryCode: string }>;
    aircraft?: Record<string, string>;
    currencies?: Record<string, string>;
    carriers?: Record<string, string>;
  };
}

export interface AirportSuggestion {
  type: string;
  subType: string;
  name: string;
  detailedName: string;
  id: string;
  iataCode: string;
  address: {
    cityName: string;
    cityCode: string;
    countryName: string;
    countryCode: string;
    regionCode?: string;
  };
}

// ============================================
// Normalized Types (Internal Use)
// ============================================

export interface NormalizedFlight {
  id: string;
  source: "amadeus";
  price: number;
  currency: string;
  isOneWay: boolean;
  isMultiCity: boolean;
  legs: NormalizedLeg[];
  airlines: string[];
  totalDuration: string;
  bookableSeats: number;
  lastTicketingDate: string;
  raw: FlightOffer; // Keep original for booking
}

export interface NormalizedLeg {
  origin: string;
  destination: string;
  departureAt: string;
  arrivalAt: string;
  duration: string;
  stops: number;
  segments: NormalizedSegment[];
}

export interface NormalizedSegment {
  origin: string;
  destination: string;
  departureAt: string;
  arrivalAt: string;
  carrier: string;
  flightNumber: string;
  aircraft: string;
  duration: string;
  cabin?: string;
}

// ============================================
// API Functions
// ============================================

/**
 * Search for flight offers with enhanced error handling
 */
export async function searchFlights(
  params: FlightSearchParams
): Promise<{ flights: NormalizedFlight[]; dictionaries: FlightSearchResponse["dictionaries"] }> {
  try {
    const amadeus = getAmadeusClient();

    // Validate parameters before API call
    validateSearchParams(params);

    console.log("Amadeus search params:", {
      origin: params.originLocationCode,
      dest: params.destinationLocationCode,
      departure: params.departureDate,
      return: params.returnDate,
      adults: params.adults,
    });

    const response = await amadeus.shopping.flightOffersSearch.get({
      originLocationCode: params.originLocationCode,
      destinationLocationCode: params.destinationLocationCode,
      departureDate: params.departureDate,
      returnDate: params.returnDate,
      adults: params.adults,
      children: params.children,
      infants: params.infants,
      travelClass: params.travelClass,
      nonStop: params.nonStop,
      currencyCode: params.currencyCode || "USD",
      maxPrice: params.maxPrice,
      max: params.max || 50,
    });

    // The Amadeus SDK returns the response with data being the array of offers directly
    // and result containing the full response with dictionaries
    const offers = response.data as FlightOffer[] | undefined;
    const result = response.result as unknown as FlightSearchResponse | undefined;

    console.log(`Amadeus raw response - offers count: ${offers?.length ?? 0}`);

    const flights = normalizeFlightOffers(offers);

    console.log(`Amadeus returned ${flights.length} normalized flight offers`);

    return {
      flights,
      dictionaries: result?.dictionaries,
    };
  } catch (error: unknown) {
    // Enhanced error handling with specific error types
    const amadeusError = parseAmadeusError(error);
    console.error("Amadeus flight search error:", amadeusError);
    throw amadeusError;
  }
}

/**
 * Validate search parameters before making API call
 */
function validateSearchParams(params: FlightSearchParams): void {
  // Validate IATA codes (3 uppercase letters)
  const iataRegex = /^[A-Z]{3}$/;

  if (!iataRegex.test(params.originLocationCode)) {
    throw new AmadeusError(
      `Invalid origin airport code: ${params.originLocationCode}`,
      { code: "INVALID_ORIGIN" }
    );
  }

  if (!iataRegex.test(params.destinationLocationCode)) {
    throw new AmadeusError(
      `Invalid destination airport code: ${params.destinationLocationCode}`,
      { code: "INVALID_DESTINATION" }
    );
  }

  // Validate same origin/destination
  if (params.originLocationCode === params.destinationLocationCode) {
    throw new AmadeusError(
      "Origin and destination cannot be the same",
      { code: "SAME_ORIGIN_DESTINATION" }
    );
  }

  // Validate date format (YYYY-MM-DD)
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

  if (!dateRegex.test(params.departureDate)) {
    throw new AmadeusError(
      `Invalid departure date format: ${params.departureDate}`,
      { code: "INVALID_DEPARTURE_DATE" }
    );
  }

  // Validate departure is not in the past
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const departure = new Date(params.departureDate);

  if (departure < today) {
    throw new AmadeusError(
      "Departure date cannot be in the past",
      { code: "PAST_DEPARTURE_DATE" }
    );
  }

  // Validate return date if provided
  if (params.returnDate) {
    if (!dateRegex.test(params.returnDate)) {
      throw new AmadeusError(
        `Invalid return date format: ${params.returnDate}`,
        { code: "INVALID_RETURN_DATE" }
      );
    }

    const returnDate = new Date(params.returnDate);
    if (returnDate <= departure) {
      throw new AmadeusError(
        "Return date must be after departure date",
        { code: "RETURN_BEFORE_DEPARTURE" }
      );
    }
  }

  // Validate passenger counts
  const totalPassengers = params.adults + (params.children || 0) + (params.infants || 0);
  if (totalPassengers > 9) {
    throw new AmadeusError(
      "Maximum 9 passengers per booking",
      { code: "TOO_MANY_PASSENGERS" }
    );
  }

  if (params.adults < 1) {
    throw new AmadeusError(
      "At least 1 adult is required",
      { code: "NO_ADULTS" }
    );
  }

  // Validate infants don't exceed adults
  if ((params.infants || 0) > params.adults) {
    throw new AmadeusError(
      "Number of infants cannot exceed number of adults",
      { code: "TOO_MANY_INFANTS" }
    );
  }
}

/**
 * Parse Amadeus API errors into user-friendly messages
 */
function parseAmadeusError(error: unknown): AmadeusError {
  // Handle Amadeus SDK error structure
  if (error && typeof error === "object" && "response" in error) {
    const amadeusResponse = error as {
      response?: {
        statusCode?: number;
        result?: {
          errors?: Array<{
            status?: number;
            code?: number;
            title?: string;
            detail?: string;
          }>;
        };
      };
      code?: string;
    };

    const statusCode = amadeusResponse.response?.statusCode;
    const errors = amadeusResponse.response?.result?.errors;
    const errorCode = amadeusResponse.code;

    // Authentication errors
    if (statusCode === 401 || errorCode === "AuthenticationError") {
      return new AmadeusError(
        "Amadeus API authentication failed. Please check your credentials.",
        { code: "AUTH_FAILED", statusCode }
      );
    }

    // Rate limiting
    if (statusCode === 429) {
      return new AmadeusError(
        "Too many requests. Please try again in a moment.",
        { code: "RATE_LIMITED", statusCode }
      );
    }

    // Parse specific Amadeus error codes
    if (errors && errors.length > 0) {
      const firstError = errors[0];

      // No results found
      if (firstError.code === 4926) {
        return new AmadeusError(
          "No flights found for this route and dates. Try different dates or a nearby airport.",
          { code: "NO_RESULTS", statusCode }
        );
      }

      // Invalid airport code
      if (firstError.code === 477 || firstError.title?.includes("INVALID CITY")) {
        return new AmadeusError(
          `Invalid airport code. Please check the origin and destination.`,
          { code: "INVALID_AIRPORT", statusCode }
        );
      }

      // Date in the past
      if (firstError.code === 572) {
        return new AmadeusError(
          "The travel date is in the past. Please select a future date.",
          { code: "PAST_DATE", statusCode }
        );
      }

      // Generic error with Amadeus message
      return new AmadeusError(
        firstError.detail || firstError.title || "Flight search failed",
        { code: `AMADEUS_${firstError.code}`, statusCode }
      );
    }

    // Server errors
    if (statusCode && statusCode >= 500) {
      return new AmadeusError(
        "Amadeus service is temporarily unavailable. Please try again later.",
        { code: "SERVICE_UNAVAILABLE", statusCode }
      );
    }
  }

  // Network errors
  if (error instanceof Error) {
    if (error.message.includes("ENOTFOUND") || error.message.includes("ECONNREFUSED")) {
      return new AmadeusError(
        "Unable to connect to flight search service. Please check your internet connection.",
        { code: "NETWORK_ERROR" }
      );
    }

    if (error.message.includes("timeout")) {
      return new AmadeusError(
        "Flight search timed out. Please try again.",
        { code: "TIMEOUT" }
      );
    }
  }

  // Fallback
  return new AmadeusError("Failed to search flights", error);
}

/**
 * Search for airports/cities by keyword
 */
export async function searchAirports(keyword: string): Promise<AirportSuggestion[]> {
  try {
    const amadeus = getAmadeusClient();
    const response = await amadeus.referenceData.locations.get({
      keyword,
      subType: "AIRPORT,CITY",
      sort: "analytics.travelers.score",
      view: "LIGHT",
    });

    return response.data as AirportSuggestion[];
  } catch (error) {
    console.error("Amadeus airport search error:", error);
    throw new AmadeusError("Failed to search airports", error);
  }
}

/**
 * Get airport details by IATA code
 */
export async function getAirport(iataCode: string): Promise<AirportSuggestion | null> {
  try {
    const amadeus = getAmadeusClient();
    const response = await amadeus.referenceData.locations.get({
      keyword: iataCode,
      subType: "AIRPORT",
    });

    const airports = response.data as AirportSuggestion[];
    return airports.find((a) => a.iataCode === iataCode) || null;
  } catch (error) {
    console.error("Amadeus get airport error:", error);
    return null;
  }
}

// ============================================
// Helpers
// ============================================

/**
 * Normalize Amadeus flight offers to internal format
 */
function normalizeFlightOffers(offers: FlightOffer[] | undefined | null): NormalizedFlight[] {
  if (!offers || offers.length === 0) {
    return [];
  }
  return offers.map((offer) => {
    const legs = offer.itineraries.map((itinerary): NormalizedLeg => {
      const firstSegment = itinerary.segments[0];
      const lastSegment = itinerary.segments[itinerary.segments.length - 1];

      return {
        origin: firstSegment.departure.iataCode,
        destination: lastSegment.arrival.iataCode,
        departureAt: firstSegment.departure.at,
        arrivalAt: lastSegment.arrival.at,
        duration: itinerary.duration,
        stops: itinerary.segments.length - 1,
        segments: itinerary.segments.map((seg): NormalizedSegment => ({
          origin: seg.departure.iataCode,
          destination: seg.arrival.iataCode,
          departureAt: seg.departure.at,
          arrivalAt: seg.arrival.at,
          carrier: seg.carrierCode,
          flightNumber: `${seg.carrierCode}${seg.number}`,
          aircraft: seg.aircraft.code,
          duration: seg.duration,
        })),
      };
    });

    // Collect all unique airlines
    const airlines = [
      ...new Set(
        offer.itineraries.flatMap((i) => i.segments.map((s) => s.carrierCode))
      ),
    ];

    return {
      id: offer.id,
      source: "amadeus" as const,
      price: parseFloat(offer.price.grandTotal),
      currency: offer.price.currency,
      isOneWay: offer.oneWay,
      isMultiCity: offer.itineraries.length > 2,
      legs,
      airlines,
      totalDuration: offer.itineraries
        .map((i) => i.duration)
        .join(" + "),
      bookableSeats: offer.numberOfBookableSeats,
      lastTicketingDate: offer.lastTicketingDate,
      raw: offer,
    };
  });
}

/**
 * Parse ISO 8601 duration to human readable
 */
export function formatDuration(isoDuration: string): string {
  const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
  if (!match) return isoDuration;

  const hours = match[1] ? parseInt(match[1]) : 0;
  const minutes = match[2] ? parseInt(match[2]) : 0;

  if (hours && minutes) return `${hours}h ${minutes}m`;
  if (hours) return `${hours}h`;
  if (minutes) return `${minutes}m`;
  return isoDuration;
}

// ============================================
// Error Handling
// ============================================

export class AmadeusError extends Error {
  public originalError: unknown;

  constructor(message: string, originalError?: unknown) {
    super(message);
    this.name = "AmadeusError";
    this.originalError = originalError;
  }
}

/**
 * Check if Amadeus is configured
 */
export function isAmadeusConfigured(): boolean {
  return !!(process.env.AMADEUS_CLIENT_ID && process.env.AMADEUS_CLIENT_SECRET);
}
