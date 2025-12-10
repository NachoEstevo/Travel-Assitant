"use client";

import { useState, useMemo } from "react";
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
import { ArrowUpDown, Filter, Plane, ChevronLeft, ChevronRight } from "lucide-react";

const ITEMS_PER_PAGE = 10;

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
  const [currentPage, setCurrentPage] = useState(1);

  // Sort and filter flights
  const processedFlights = useMemo(() => {
    return [...flights]
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
  }, [flights, showDirectOnly, sortBy]);

  // Pagination
  const totalPages = Math.ceil(processedFlights.length / ITEMS_PER_PAGE);
  const paginatedFlights = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return processedFlights.slice(start, start + ITEMS_PER_PAGE);
  }, [processedFlights, currentPage]);

  // Reset to page 1 when filters change
  const handleFilterChange = (directOnly: boolean) => {
    setShowDirectOnly(directOnly);
    setCurrentPage(1);
  };

  const handleSortChange = (sort: SortOption) => {
    setSortBy(sort);
    setCurrentPage(1);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <ResultsHeader
          count={0}
          sortBy={sortBy}
          setSortBy={handleSortChange}
          showDirectOnly={showDirectOnly}
          setShowDirectOnly={handleFilterChange}
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
        setSortBy={handleSortChange}
        showDirectOnly={showDirectOnly}
        setShowDirectOnly={handleFilterChange}
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
        {paginatedFlights.map((flight, index) => (
          <FlightCard
            key={flight.id}
            flight={flight}
            carriers={carriers}
            index={index}
          />
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={processedFlights.length}
          itemsPerPage={ITEMS_PER_PAGE}
          onPageChange={setCurrentPage}
        />
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

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
}

function Pagination({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onPageChange,
}: PaginationProps) {
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  // Generate page numbers to show
  const getPageNumbers = () => {
    const pages: (number | "...")[] = [];

    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    pages.push(1);

    if (currentPage > 3) {
      pages.push("...");
    }

    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    if (currentPage < totalPages - 2) {
      pages.push("...");
    }

    pages.push(totalPages);

    return pages;
  };

  return (
    <div className="flex items-center justify-between py-4 border-t border-border">
      <p className="text-sm text-muted-foreground">
        Showing {startItem}-{endItem} of {totalItems} flights
      </p>

      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        {getPageNumbers().map((page, i) =>
          page === "..." ? (
            <span key={`ellipsis-${i}`} className="px-2 text-muted-foreground">
              ...
            </span>
          ) : (
            <Button
              key={page}
              variant={currentPage === page ? "default" : "outline"}
              size="sm"
              onClick={() => onPageChange(page)}
              className="w-9"
            >
              {page}
            </Button>
          )
        )}

        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
