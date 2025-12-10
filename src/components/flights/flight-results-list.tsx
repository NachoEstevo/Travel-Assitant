"use client";

import { useState, useMemo, useEffect } from "react";
import { NormalizedFlight } from "@/lib/amadeus";
import { FlightCard } from "./flight-card";
import { FlightCardSkeleton } from "./flight-card-skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  ArrowUpDown,
  Filter,
  Plane,
  ChevronLeft,
  ChevronRight,
  X,
  Clock,
  DollarSign,
  SlidersHorizontal,
} from "lucide-react";

const ITEMS_PER_PAGE = 10;
const FILTER_STORAGE_KEY = "flightFilters";

// Time of day ranges
type TimeOfDay = "morning" | "afternoon" | "evening" | "night";
const TIME_RANGES: Record<TimeOfDay, { label: string; start: number; end: number }> = {
  morning: { label: "Morning", start: 5, end: 12 },
  afternoon: { label: "Afternoon", start: 12, end: 17 },
  evening: { label: "Evening", start: 17, end: 21 },
  night: { label: "Night", start: 21, end: 5 },
};

interface Filters {
  priceRange: [number, number];
  maxDuration: number | null;
  maxStops: number | null;
  directOnly: boolean;
  timeOfDay: TimeOfDay[];
  airlines: string[];
}

const defaultFilters: Filters = {
  priceRange: [0, 10000],
  maxDuration: null,
  maxStops: null,
  directOnly: false,
  timeOfDay: [],
  airlines: [],
};

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
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Calculate price and duration bounds from flights
  const bounds = useMemo(() => {
    if (flights.length === 0) {
      return { minPrice: 0, maxPrice: 10000, maxDurationMins: 2400 };
    }
    const prices = flights.map((f) => f.price);
    const durations = flights.map((f) => parseDuration(f.legs[0].duration));
    return {
      minPrice: Math.floor(Math.min(...prices)),
      maxPrice: Math.ceil(Math.max(...prices)),
      maxDurationMins: Math.max(...durations),
    };
  }, [flights]);

  // Get unique airlines
  const uniqueAirlines = useMemo(() => {
    const airlineSet = new Set<string>();
    flights.forEach((f) => f.airlines.forEach((a) => airlineSet.add(a)));
    return Array.from(airlineSet).sort();
  }, [flights]);

  // Load saved filters from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(FILTER_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        setFilters((prev) => ({
          ...prev,
          ...parsed,
          // Reset price range to fit current flights
          priceRange: [bounds.minPrice, bounds.maxPrice],
        }));
      }
    } catch (e) {
      console.error("Failed to load filters:", e);
    }
  }, [bounds.minPrice, bounds.maxPrice]);

  // Save filters to localStorage (except price range which is dynamic)
  useEffect(() => {
    try {
      const toSave = {
        maxDuration: filters.maxDuration,
        maxStops: filters.maxStops,
        directOnly: filters.directOnly,
        timeOfDay: filters.timeOfDay,
        // Don't save airlines as they're specific to each search
      };
      localStorage.setItem(FILTER_STORAGE_KEY, JSON.stringify(toSave));
    } catch (e) {
      console.error("Failed to save filters:", e);
    }
  }, [filters.maxDuration, filters.maxStops, filters.directOnly, filters.timeOfDay]);

  // Initialize price range when flights change
  useEffect(() => {
    if (flights.length > 0) {
      setFilters((prev) => ({
        ...prev,
        priceRange: [bounds.minPrice, bounds.maxPrice],
      }));
    }
  }, [bounds.minPrice, bounds.maxPrice, flights.length]);

  // Filter and sort flights
  const processedFlights = useMemo(() => {
    return [...flights]
      .filter((f) => {
        // Price filter
        if (f.price < filters.priceRange[0] || f.price > filters.priceRange[1]) {
          return false;
        }

        // Direct only
        if (filters.directOnly && f.legs[0].stops > 0) {
          return false;
        }

        // Max stops
        if (filters.maxStops !== null && f.legs[0].stops > filters.maxStops) {
          return false;
        }

        // Duration filter
        if (filters.maxDuration !== null) {
          const durationMins = parseDuration(f.legs[0].duration);
          if (durationMins > filters.maxDuration * 60) {
            return false;
          }
        }

        // Time of day filter
        if (filters.timeOfDay.length > 0) {
          const departureHour = new Date(f.legs[0].departureAt).getHours();
          const matchesTime = filters.timeOfDay.some((tod) => {
            const range = TIME_RANGES[tod];
            if (tod === "night") {
              return departureHour >= range.start || departureHour < range.end;
            }
            return departureHour >= range.start && departureHour < range.end;
          });
          if (!matchesTime) return false;
        }

        // Airline filter
        if (filters.airlines.length > 0) {
          const hasAirline = f.airlines.some((a) => filters.airlines.includes(a));
          if (!hasAirline) return false;
        }

        return true;
      })
      .sort((a, b) => {
        switch (sortBy) {
          case "price":
            return a.price - b.price;
          case "duration":
            return parseDuration(a.legs[0].duration) - parseDuration(b.legs[0].duration);
          case "stops":
            return a.legs[0].stops - b.legs[0].stops;
          case "departure":
            return new Date(a.legs[0].departureAt).getTime() - new Date(b.legs[0].departureAt).getTime();
          default:
            return 0;
        }
      });
  }, [flights, filters, sortBy]);

  // Pagination
  const totalPages = Math.ceil(processedFlights.length / ITEMS_PER_PAGE);
  const paginatedFlights = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return processedFlights.slice(start, start + ITEMS_PER_PAGE);
  }, [processedFlights, currentPage]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters, sortBy]);

  // Count active filters
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.directOnly) count++;
    if (filters.maxStops !== null) count++;
    if (filters.maxDuration !== null) count++;
    if (filters.timeOfDay.length > 0) count++;
    if (filters.airlines.length > 0) count++;
    if (
      filters.priceRange[0] > bounds.minPrice ||
      filters.priceRange[1] < bounds.maxPrice
    ) {
      count++;
    }
    return count;
  }, [filters, bounds]);

  const clearFilters = () => {
    setFilters({
      ...defaultFilters,
      priceRange: [bounds.minPrice, bounds.maxPrice],
    });
  };

  const updateFilter = <K extends keyof Filters>(key: K, value: Filters[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <ResultsHeader
          count={0}
          sortBy={sortBy}
          setSortBy={setSortBy}
          activeFilterCount={0}
          onOpenFilters={() => {}}
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
        <h3 className="font-display text-2xl font-semibold mb-2">No flights found</h3>
        <p className="text-muted-foreground max-w-md mx-auto">
          We couldn&apos;t find any flights matching your search. Try adjusting your dates or destinations.
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
        sortBy={sortBy}
        setSortBy={setSortBy}
        activeFilterCount={activeFilterCount}
        onOpenFilters={() => setIsFilterOpen(true)}
        searchId={searchId}
      />

      {/* Filters Panel */}
      <FiltersPanel
        isOpen={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        filters={filters}
        updateFilter={updateFilter}
        clearFilters={clearFilters}
        bounds={bounds}
        uniqueAirlines={uniqueAirlines}
        carriers={carriers}
        directCount={directCount}
      />

      {/* Active Filters Pills */}
      {activeFilterCount > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">Active filters:</span>
          {filters.directOnly && (
            <FilterPill label="Direct only" onRemove={() => updateFilter("directOnly", false)} />
          )}
          {filters.maxStops !== null && (
            <FilterPill
              label={`Max ${filters.maxStops} stop${filters.maxStops !== 1 ? "s" : ""}`}
              onRemove={() => updateFilter("maxStops", null)}
            />
          )}
          {filters.maxDuration !== null && (
            <FilterPill
              label={`Max ${filters.maxDuration}h`}
              onRemove={() => updateFilter("maxDuration", null)}
            />
          )}
          {(filters.priceRange[0] > bounds.minPrice || filters.priceRange[1] < bounds.maxPrice) && (
            <FilterPill
              label={`$${filters.priceRange[0]} - $${filters.priceRange[1]}`}
              onRemove={() => updateFilter("priceRange", [bounds.minPrice, bounds.maxPrice])}
            />
          )}
          {filters.timeOfDay.length > 0 && (
            <FilterPill
              label={filters.timeOfDay.map((t) => TIME_RANGES[t].label).join(", ")}
              onRemove={() => updateFilter("timeOfDay", [])}
            />
          )}
          {filters.airlines.length > 0 && (
            <FilterPill
              label={`${filters.airlines.length} airline${filters.airlines.length > 1 ? "s" : ""}`}
              onRemove={() => updateFilter("airlines", [])}
            />
          )}
          <Button variant="ghost" size="sm" onClick={clearFilters} className="text-xs h-7">
            Clear all
          </Button>
        </div>
      )}

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
              ${Math.round(processedFlights.reduce((sum, f) => sum + f.price, 0) / processedFlights.length)}
            </span>
          </div>
          {directCount > 0 && processedFlights.some((f) => f.legs[0].stops === 0) && (
            <>
              <div className="w-px h-4 bg-border" />
              <div>
                <span className="text-muted-foreground">Direct from: </span>
                <span className="font-medium text-accent">
                  ${Math.round(Math.min(...processedFlights.filter((f) => f.legs[0].stops === 0).map((f) => f.price)))}
                </span>
              </div>
            </>
          )}
        </div>
      )}

      {/* No results after filtering */}
      {processedFlights.length === 0 && (
        <div className="text-center py-12">
          <Filter className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No flights match your filters</h3>
          <p className="text-muted-foreground mb-4">Try adjusting your filters to see more results.</p>
          <Button variant="outline" onClick={clearFilters}>
            Clear all filters
          </Button>
        </div>
      )}

      {/* Flight cards */}
      {processedFlights.length > 0 && (
        <div className="space-y-4">
          {paginatedFlights.map((flight, index) => (
            <FlightCard key={flight.id} flight={flight} carriers={carriers} index={index} />
          ))}
        </div>
      )}

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

// Filter pill component
function FilterPill({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <Badge variant="secondary" className="gap-1 pr-1">
      {label}
      <button onClick={onRemove} className="ml-1 hover:bg-muted rounded-full p-0.5">
        <X className="h-3 w-3" />
      </button>
    </Badge>
  );
}

// Filters Panel Component
interface FiltersPanelProps {
  isOpen: boolean;
  onClose: () => void;
  filters: Filters;
  updateFilter: <K extends keyof Filters>(key: K, value: Filters[K]) => void;
  clearFilters: () => void;
  bounds: { minPrice: number; maxPrice: number; maxDurationMins: number };
  uniqueAirlines: string[];
  carriers?: Record<string, string>;
  directCount: number;
}

function FiltersPanel({
  isOpen,
  onClose,
  filters,
  updateFilter,
  clearFilters,
  bounds,
  uniqueAirlines,
  carriers,
  directCount,
}: FiltersPanelProps) {
  if (!isOpen) return null;

  const maxDurationHours = Math.ceil(bounds.maxDurationMins / 60);

  return (
    <div className="p-4 rounded-lg border border-border bg-card space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4" />
          Filters
        </h3>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            Clear all
          </Button>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Price Range */}
        <div className="space-y-3">
          <Label className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Price Range
          </Label>
          <Slider
            value={filters.priceRange}
            min={bounds.minPrice}
            max={bounds.maxPrice}
            step={10}
            onValueChange={(value) => updateFilter("priceRange", value as [number, number])}
            className="mt-2"
          />
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>${filters.priceRange[0]}</span>
            <span>${filters.priceRange[1]}</span>
          </div>
        </div>

        {/* Max Duration */}
        <div className="space-y-3">
          <Label className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Max Duration
          </Label>
          <Select
            value={filters.maxDuration?.toString() || "any"}
            onValueChange={(v) => updateFilter("maxDuration", v === "any" ? null : parseInt(v))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Any duration" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="any">Any duration</SelectItem>
              {[4, 6, 8, 10, 12, 16, 20, 24, 30, 36].filter((h) => h <= maxDurationHours + 2).map((hours) => (
                <SelectItem key={hours} value={hours.toString()}>
                  Up to {hours} hours
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Stops */}
        <div className="space-y-3">
          <Label>Stops</Label>
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="direct-only"
                checked={filters.directOnly}
                onCheckedChange={(checked) => updateFilter("directOnly", !!checked)}
              />
              <label htmlFor="direct-only" className="text-sm cursor-pointer">
                Direct flights only ({directCount})
              </label>
            </div>
            {!filters.directOnly && (
              <Select
                value={filters.maxStops?.toString() || "any"}
                onValueChange={(v) => updateFilter("maxStops", v === "any" ? null : parseInt(v))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Any stops" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any number of stops</SelectItem>
                  <SelectItem value="1">Max 1 stop</SelectItem>
                  <SelectItem value="2">Max 2 stops</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        {/* Time of Day */}
        <div className="space-y-3">
          <Label>Departure Time</Label>
          <div className="grid grid-cols-2 gap-2">
            {(Object.keys(TIME_RANGES) as TimeOfDay[]).map((tod) => (
              <div key={tod} className="flex items-center space-x-2">
                <Checkbox
                  id={`time-${tod}`}
                  checked={filters.timeOfDay.includes(tod)}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      updateFilter("timeOfDay", [...filters.timeOfDay, tod]);
                    } else {
                      updateFilter("timeOfDay", filters.timeOfDay.filter((t) => t !== tod));
                    }
                  }}
                />
                <label htmlFor={`time-${tod}`} className="text-sm cursor-pointer">
                  {TIME_RANGES[tod].label}
                  <span className="text-xs text-muted-foreground ml-1">
                    ({TIME_RANGES[tod].start}:00-{TIME_RANGES[tod].end}:00)
                  </span>
                </label>
              </div>
            ))}
          </div>
        </div>

        {/* Airlines */}
        {uniqueAirlines.length > 1 && (
          <div className="space-y-3 md:col-span-2 lg:col-span-2">
            <Label>Airlines</Label>
            <div className="flex flex-wrap gap-2">
              {uniqueAirlines.map((code) => (
                <div key={code} className="flex items-center space-x-2">
                  <Checkbox
                    id={`airline-${code}`}
                    checked={filters.airlines.includes(code)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        updateFilter("airlines", [...filters.airlines, code]);
                      } else {
                        updateFilter("airlines", filters.airlines.filter((a) => a !== code));
                      }
                    }}
                  />
                  <label htmlFor={`airline-${code}`} className="text-sm cursor-pointer">
                    {carriers?.[code] || code}
                  </label>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-end pt-2 border-t border-border">
        <Button onClick={onClose}>Apply Filters</Button>
      </div>
    </div>
  );
}

interface ResultsHeaderProps {
  count: number;
  totalCount?: number;
  sortBy: SortOption;
  setSortBy: (value: SortOption) => void;
  activeFilterCount: number;
  onOpenFilters: () => void;
  searchId?: string;
  isLoading?: boolean;
}

function ResultsHeader({
  count,
  totalCount,
  sortBy,
  setSortBy,
  activeFilterCount,
  onOpenFilters,
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
                (filtered from {totalCount})
              </span>
            )}
          </h2>
        )}
        {searchId && (
          <p className="text-xs text-muted-foreground mt-0.5">Search #{searchId.slice(0, 8)}</p>
        )}
      </div>

      <div className="flex items-center gap-3">
        {/* Filters button */}
        <Button variant="outline" size="sm" onClick={onOpenFilters} className="text-sm">
          <SlidersHorizontal className="w-3.5 h-3.5 mr-1.5" />
          Filters
          {activeFilterCount > 0 && (
            <Badge variant="secondary" className="ml-1.5 h-5 px-1.5">
              {activeFilterCount}
            </Badge>
          )}
        </Button>

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
