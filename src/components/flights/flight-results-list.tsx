"use client";

import { useState } from "react";
import { NormalizedFlight } from "@/lib/amadeus";
import { FlightCard } from "./flight-card";
import { FlightCardSkeleton } from "./flight-card-skeleton";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowUpDown, Filter, Plane } from "lucide-react";

interface FlightResultsListProps {
  flights: NormalizedFlight[];
  carriers?: Record<string, string>;
  isLoading?: boolean;
  searchId?: string;
}

type SortOption = "price" | "duration" | "stops" | "departure";

export function FlightResultsList({
  flights,
  carriers,
  isLoading,
  searchId,
}: FlightResultsListProps) {
  const [sortBy, setSortBy] = useState<SortOption>("price");
  const [showDirectOnly, setShowDirectOnly] = useState(false);

  // Sort and filter flights
  const processedFlights = [...flights]
    .filter((f) => !showDirectOnly || f.legs[0].stops === 0)
    .sort((a, b) => {
      switch (sortBy) {
        case "price":
          return a.price - b.price;
        case "duration":
          return (
            parseDuration(a.legs[0].duration) -
            parseDuration(b.legs[0].duration)
          );
        case "stops":
          return a.legs[0].stops - b.legs[0].stops;
        case "departure":
          return (
            new Date(a.legs[0].departureAt).getTime() -
            new Date(b.legs[0].departureAt).getTime()
          );
        default:
          return 0;
      }
    });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <ResultsHeader
          count={0}
          sortBy={sortBy}
          setSortBy={setSortBy}
          showDirectOnly={showDirectOnly}
          setShowDirectOnly={setShowDirectOnly}
          isLoading
        />
        {Array.from({ length: 5 }).map((_, i) => (
          <FlightCardSkeleton key={i} index={i} />
        ))}
      </div>
    );
  }

  if (flights.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-muted mb-6">
          <Plane className="w-10 h-10 text-muted-foreground" />
        </div>
        <h3 className="font-display text-2xl font-semibold mb-2">
          No flights found
        </h3>
        <p className="text-muted-foreground max-w-md mx-auto">
          We couldn't find any flights matching your search. Try adjusting your
          dates or destinations.
        </p>
      </div>
    );
  }

  const directCount = flights.filter((f) => f.legs[0].stops === 0).length;

  return (
    <div className="space-y-4">
      <ResultsHeader
        count={processedFlights.length}
        totalCount={flights.length}
        directCount={directCount}
        sortBy={sortBy}
        setSortBy={setSortBy}
        showDirectOnly={showDirectOnly}
        setShowDirectOnly={setShowDirectOnly}
        searchId={searchId}
      />

      {/* Price summary */}
      {processedFlights.length > 0 && (
        <div className="flex items-center gap-6 px-1 py-3 text-sm">
          <div>
            <span className="text-muted-foreground">Cheapest: </span>
            <span className="font-display font-semibold text-primary">
              ${Math.round(Math.min(...processedFlights.map((f) => f.price)))}
            </span>
          </div>
          <div className="w-px h-4 bg-border" />
          <div>
            <span className="text-muted-foreground">Average: </span>
            <span className="font-medium">
              $
              {Math.round(
                processedFlights.reduce((sum, f) => sum + f.price, 0) /
                  processedFlights.length
              )}
            </span>
          </div>
          {directCount > 0 && (
            <>
              <div className="w-px h-4 bg-border" />
              <div>
                <span className="text-muted-foreground">Direct from: </span>
                <span className="font-medium text-accent">
                  $
                  {Math.round(
                    Math.min(
                      ...flights
                        .filter((f) => f.legs[0].stops === 0)
                        .map((f) => f.price)
                    )
                  )}
                </span>
              </div>
            </>
          )}
        </div>
      )}

      {/* Flight cards */}
      <div className="space-y-4">
        {processedFlights.map((flight, index) => (
          <FlightCard
            key={flight.id}
            flight={flight}
            carriers={carriers}
            index={index}
          />
        ))}
      </div>

      {/* Load more placeholder */}
      {processedFlights.length >= 50 && (
        <div className="text-center pt-4">
          <Button variant="outline" className="font-medium">
            Load more results
          </Button>
        </div>
      )}
    </div>
  );
}

interface ResultsHeaderProps {
  count: number;
  totalCount?: number;
  directCount?: number;
  sortBy: SortOption;
  setSortBy: (value: SortOption) => void;
  showDirectOnly: boolean;
  setShowDirectOnly: (value: boolean) => void;
  searchId?: string;
  isLoading?: boolean;
}

function ResultsHeader({
  count,
  totalCount,
  directCount,
  sortBy,
  setSortBy,
  showDirectOnly,
  setShowDirectOnly,
  searchId,
  isLoading,
}: ResultsHeaderProps) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-border">
      <div>
        {isLoading ? (
          <div className="h-6 w-32 animate-shimmer rounded" />
        ) : (
          <h2 className="font-display text-xl font-semibold">
            {count} flight{count !== 1 ? "s" : ""} found
            {totalCount && count < totalCount && (
              <span className="text-sm font-normal text-muted-foreground ml-2">
                (showing {count} of {totalCount})
              </span>
            )}
          </h2>
        )}
        {searchId && (
          <p className="text-xs text-muted-foreground mt-0.5">
            Search #{searchId.slice(0, 8)}
          </p>
        )}
      </div>

      <div className="flex items-center gap-3">
        {/* Direct flights filter */}
        {directCount !== undefined && directCount > 0 && (
          <Button
            variant={showDirectOnly ? "default" : "outline"}
            size="sm"
            onClick={() => setShowDirectOnly(!showDirectOnly)}
            className="text-sm"
          >
            <Filter className="w-3.5 h-3.5 mr-1.5" />
            Direct only ({directCount})
          </Button>
        )}

        {/* Sort dropdown */}
        <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
          <SelectTrigger className="w-[160px] text-sm">
            <ArrowUpDown className="w-3.5 h-3.5 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="price">Price: Low to High</SelectItem>
            <SelectItem value="duration">Duration: Shortest</SelectItem>
            <SelectItem value="stops">Stops: Fewest</SelectItem>
            <SelectItem value="departure">Departure: Earliest</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

// Helper to parse ISO duration to minutes
function parseDuration(iso: string): number {
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
  if (!match) return 0;
  const hours = match[1] ? parseInt(match[1]) : 0;
  const minutes = match[2] ? parseInt(match[2]) : 0;
  return hours * 60 + minutes;
}
