/**
 * Multi-City Route Optimization Service
 *
 * Searches for split-ticket routes through stopover hubs
 * and compares them with direct flights to find savings.
 */

import { searchFlights, NormalizedFlight, FlightSearchParams } from "./amadeus";
import { findSuitableHubs, StopoverHub, getMinimumLayover } from "./stopovers";

export interface RouteSegment {
  origin: string;
  destination: string;
  departureDate: string;
  bestFlight: NormalizedFlight | null;
  alternativeFlights: NormalizedFlight[];
}

export interface MultiCityRoute {
  id: string;
  type: "direct" | "stopover";
  stopoverHub?: StopoverHub;
  segments: RouteSegment[];
  totalPrice: number;
  currency: string;
  savingsVsDirect?: number;
  savingsPercent?: number;
  totalDuration: string;
  layoverDuration?: string;
  score: number; // 0-100, higher is better (considers price, time, convenience)
  warnings?: string[];
}

export interface MultiCitySearchParams {
  origin: string;
  destination: string;
  departureDate: string;
  returnDate?: string;
  adults: number;
  travelClass?: "ECONOMY" | "PREMIUM_ECONOMY" | "BUSINESS" | "FIRST";
  maxHubs?: number;
}

export interface MultiCitySearchResult {
  directRoute: MultiCityRoute | null;
  stopoverRoutes: MultiCityRoute[];
  bestRoute: MultiCityRoute | null;
  searchStats: {
    hubsSearched: number;
    totalSearches: number;
    searchTimeMs: number;
  };
}

/**
 * Search for multi-city routes with potential savings
 */
export async function searchMultiCityRoutes(
  params: MultiCitySearchParams
): Promise<MultiCitySearchResult> {
  const startTime = Date.now();
  const searchStats = {
    hubsSearched: 0,
    totalSearches: 0,
    searchTimeMs: 0,
  };

  // Find suitable stopover hubs
  const hubs = findSuitableHubs(
    params.origin,
    params.destination,
    params.maxHubs || 3
  );

  // Search for direct flights
  let directRoute: MultiCityRoute | null = null;
  try {
    const directResult = await searchFlights({
      originLocationCode: params.origin,
      destinationLocationCode: params.destination,
      departureDate: params.departureDate,
      returnDate: params.returnDate,
      adults: params.adults,
      travelClass: params.travelClass,
      max: 10,
    });
    searchStats.totalSearches++;

    if (directResult.flights.length > 0) {
      const bestDirect = directResult.flights[0];
      directRoute = {
        id: `direct-${params.origin}-${params.destination}`,
        type: "direct",
        segments: [
          {
            origin: params.origin,
            destination: params.destination,
            departureDate: params.departureDate,
            bestFlight: bestDirect,
            alternativeFlights: directResult.flights.slice(1, 5),
          },
        ],
        totalPrice: bestDirect.price,
        currency: bestDirect.currency,
        totalDuration: bestDirect.totalDuration,
        score: calculateRouteScore(bestDirect.price, bestDirect.totalDuration, 0),
      };
    }
  } catch (error) {
    console.error("Direct search failed:", error);
  }

  // Search through each hub
  const stopoverRoutes: MultiCityRoute[] = [];

  for (const hub of hubs) {
    try {
      searchStats.hubsSearched++;

      // Search origin -> hub
      const leg1Result = await searchFlights({
        originLocationCode: params.origin,
        destinationLocationCode: hub.code,
        departureDate: params.departureDate,
        adults: params.adults,
        travelClass: params.travelClass,
        max: 5,
      });
      searchStats.totalSearches++;

      if (leg1Result.flights.length === 0) continue;

      // Calculate arrival time at hub to determine departure date for leg 2
      const leg1Best = leg1Result.flights[0];
      const leg1Arrival = new Date(leg1Best.legs[0].arrivalAt);
      const minLayover = getMinimumLayover(hub.code);

      // Add layover time
      const leg2DepartureTime = new Date(leg1Arrival.getTime() + minLayover * 60 * 60 * 1000);
      const leg2Date = leg2DepartureTime.toISOString().split("T")[0];

      // Search hub -> destination
      const leg2Result = await searchFlights({
        originLocationCode: hub.code,
        destinationLocationCode: params.destination,
        departureDate: leg2Date,
        adults: params.adults,
        travelClass: params.travelClass,
        max: 5,
      });
      searchStats.totalSearches++;

      if (leg2Result.flights.length === 0) continue;

      const leg2Best = leg2Result.flights[0];

      // Calculate total price and duration
      const totalPrice = leg1Best.price + leg2Best.price;
      const leg2Departure = new Date(leg2Best.legs[0].departureAt);
      const layoverMs = leg2Departure.getTime() - leg1Arrival.getTime();
      const layoverHours = Math.round(layoverMs / (1000 * 60 * 60) * 10) / 10;

      // Validate layover is reasonable (2-24 hours)
      const warnings: string[] = [];
      if (layoverHours < 2) {
        warnings.push("Short layover - connection may be tight");
      } else if (layoverHours > 24) {
        warnings.push("Long layover - may require overnight stay");
      }

      // Calculate savings
      const savingsVsDirect = directRoute
        ? directRoute.totalPrice - totalPrice
        : 0;
      const savingsPercent = directRoute
        ? Math.round((savingsVsDirect / directRoute.totalPrice) * 100)
        : 0;

      // Calculate total duration
      const leg1Departure = new Date(leg1Best.legs[0].departureAt);
      const leg2Arrival = new Date(leg2Best.legs[0].arrivalAt);
      const totalMs = leg2Arrival.getTime() - leg1Departure.getTime();
      const totalHours = Math.round(totalMs / (1000 * 60 * 60) * 10) / 10;

      const stopoverRoute: MultiCityRoute = {
        id: `stopover-${hub.code}-${Date.now()}`,
        type: "stopover",
        stopoverHub: hub,
        segments: [
          {
            origin: params.origin,
            destination: hub.code,
            departureDate: params.departureDate,
            bestFlight: leg1Best,
            alternativeFlights: leg1Result.flights.slice(1, 3),
          },
          {
            origin: hub.code,
            destination: params.destination,
            departureDate: leg2Date,
            bestFlight: leg2Best,
            alternativeFlights: leg2Result.flights.slice(1, 3),
          },
        ],
        totalPrice,
        currency: leg1Best.currency,
        savingsVsDirect: savingsVsDirect > 0 ? savingsVsDirect : undefined,
        savingsPercent: savingsPercent > 0 ? savingsPercent : undefined,
        totalDuration: `${totalHours}h`,
        layoverDuration: `${layoverHours}h in ${hub.city}`,
        score: calculateRouteScore(totalPrice, `${totalHours}h`, layoverHours),
        warnings: warnings.length > 0 ? warnings : undefined,
      };

      stopoverRoutes.push(stopoverRoute);
    } catch (error) {
      console.error(`Hub search failed for ${hub.code}:`, error);
    }
  }

  // Sort stopover routes by score
  stopoverRoutes.sort((a, b) => b.score - a.score);

  // Determine best overall route
  let bestRoute = directRoute;
  if (stopoverRoutes.length > 0) {
    const bestStopover = stopoverRoutes[0];
    if (
      !directRoute ||
      (bestStopover.savingsPercent && bestStopover.savingsPercent >= 10)
    ) {
      // Prefer stopover if it saves at least 10%
      bestRoute = bestStopover;
    }
  }

  searchStats.searchTimeMs = Date.now() - startTime;

  return {
    directRoute,
    stopoverRoutes,
    bestRoute,
    searchStats,
  };
}

/**
 * Calculate a route score (0-100)
 * Higher is better - balances price, time, and convenience
 */
function calculateRouteScore(
  price: number,
  duration: string,
  layoverHours: number
): number {
  // Parse duration
  const durationMatch = duration.match(/(\d+(?:\.\d+)?)/);
  const hours = durationMatch ? parseFloat(durationMatch[1]) : 24;

  // Price score (lower is better, normalized)
  // Assume $500-$2000 range for international flights
  const priceScore = Math.max(0, Math.min(100, 100 - ((price - 300) / 20)));

  // Duration score (shorter is better)
  // Assume 6-30 hour range for international flights
  const durationScore = Math.max(0, Math.min(100, 100 - ((hours - 6) * 4)));

  // Layover penalty (prefer 2-4 hour layovers)
  let layoverPenalty = 0;
  if (layoverHours > 0) {
    if (layoverHours < 2) layoverPenalty = 20;
    else if (layoverHours > 8) layoverPenalty = 15;
    else if (layoverHours > 4) layoverPenalty = 5;
  }

  // Weighted average
  const score = priceScore * 0.5 + durationScore * 0.3 - layoverPenalty;

  return Math.max(0, Math.min(100, Math.round(score)));
}

/**
 * Format price with currency
 */
export function formatPrice(price: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price);
}
