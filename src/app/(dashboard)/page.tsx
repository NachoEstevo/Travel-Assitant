"use client";

import { useState, useEffect, useCallback } from "react";
import {
  FlightSearchForm,
  FlightResultsList,
  RouteComparison,
  RouteComparisonSkeleton,
  SearchProgress,
  type SearchStage,
} from "@/components/flights";
import { NormalizedFlight } from "@/lib/amadeus";
import { MultiCitySearchResult } from "@/lib/multi-city";
import { ParsedTravelQuery } from "@/lib/openai";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Compass, Route, Bell, Plane, Sparkles, Info, Clock, RefreshCw, Bookmark, X, Play, Trash2, GitCompare, Loader2, Trophy, Timer, ArrowRight } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { getSavedSearches, saveSearch, deleteSavedSearch, SavedSearch } from "@/lib/saved-searches";
import { useRouter } from "next/navigation";

const CACHE_KEY = "flightSearchCache";
const CACHE_MAX_AGE_MS = 30 * 60 * 1000; // 30 minutes

interface CachedSearch {
  result: SearchResult;
  timestamp: number;
  query?: string; // Natural language query if used
}

interface SearchParams {
  origin: string;
  destination: string;
  departureDate: string;
  returnDate?: string;
  adults: number;
  travelClass: "ECONOMY" | "PREMIUM_ECONOMY" | "BUSINESS" | "FIRST";
}

interface SearchResult {
  searchId: string;
  flights: NormalizedFlight[];
  carriers?: Record<string, string>;
  parsedQuery?: ParsedTravelQuery;
  insight?: string;
}

export default function HomePage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isComparingRoutes, setIsComparingRoutes] = useState(false);
  const [searchResult, setSearchResult] = useState<SearchResult | null>(null);
  const [routeComparison, setRouteComparison] = useState<MultiCitySearchResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [clarificationQuestions, setClarificationQuestions] = useState<string[]>([]);
  const [cachedAt, setCachedAt] = useState<number | null>(null);
  const [lastQuery, setLastQuery] = useState<string | null>(null);
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  const [searchStage, setSearchStage] = useState<SearchStage>("parsing");
  const [isNaturalLanguageSearch, setIsNaturalLanguageSearch] = useState(true);

  // Load saved searches on mount
  useEffect(() => {
    setSavedSearches(getSavedSearches());
  }, []);

  // Save results to sessionStorage
  const cacheResults = useCallback((result: SearchResult, query?: string) => {
    const cache: CachedSearch = {
      result,
      timestamp: Date.now(),
      query,
    };
    try {
      sessionStorage.setItem(CACHE_KEY, JSON.stringify(cache));
      setCachedAt(cache.timestamp);
      setLastQuery(query || null);
    } catch (e) {
      console.error("Failed to cache search results:", e);
    }
  }, []);

  // Load cached results or re-run search results from history page
  useEffect(() => {
    // First check for re-run data from history page
    const rerunData = sessionStorage.getItem("rerunSearch");
    if (rerunData) {
      try {
        const data = JSON.parse(rerunData);
        const result = {
          searchId: data.searchId,
          flights: data.flights,
          carriers: data.carriers,
          parsedQuery: data.parsedQuery,
          insight: data.insight,
        };
        setSearchResult(result);
        cacheResults(result, data.query);
      } catch (e) {
        console.error("Failed to parse rerun search data:", e);
      }
      sessionStorage.removeItem("rerunSearch");
      return;
    }

    // Then check for cached results
    const cachedData = sessionStorage.getItem(CACHE_KEY);
    if (cachedData) {
      try {
        const cache: CachedSearch = JSON.parse(cachedData);
        const age = Date.now() - cache.timestamp;

        // Only restore if cache is fresh (< 30 minutes)
        if (age < CACHE_MAX_AGE_MS) {
          setSearchResult(cache.result);
          setCachedAt(cache.timestamp);
          setLastQuery(cache.query || null);
        } else {
          // Clear stale cache
          sessionStorage.removeItem(CACHE_KEY);
        }
      } catch (e) {
        console.error("Failed to parse cached search data:", e);
        sessionStorage.removeItem(CACHE_KEY);
      }
    }
  }, [cacheResults]);

  // Manual structured search
  const handleSearch = async (params: SearchParams) => {
    setIsLoading(true);
    setIsNaturalLanguageSearch(false);
    setSearchStage("searching");
    setError(null);
    setClarificationQuestions([]);

    try {
      const response = await fetch("/api/flights/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          origin: params.origin.toUpperCase(),
          destination: params.destination.toUpperCase(),
          departureDate: params.departureDate,
          returnDate: params.returnDate,
          adults: params.adults,
          travelClass: params.travelClass,
        }),
      });

      setSearchStage("processing");
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Search failed");
      }

      setSearchStage("complete");
      const result = {
        searchId: data.data.searchId,
        flights: data.data.flights,
        carriers: data.data.dictionaries?.carriers,
      };
      setSearchResult(result);
      cacheResults(result);
      toast.success(`Found ${result.flights.length} flights`);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "An error occurred";
      setError(errorMsg);
      setSearchResult(null);
      toast.error("Search failed", { description: errorMsg });
    } finally {
      setIsLoading(false);
    }
  };

  // Natural language search
  const handleNaturalSearch = async (query: string) => {
    setIsLoading(true);
    setIsNaturalLanguageSearch(true);
    setSearchStage("parsing");
    setError(null);
    setClarificationQuestions([]);

    try {
      // Simulate parsing stage (API handles this but we show it)
      await new Promise((resolve) => setTimeout(resolve, 500));
      setSearchStage("searching");

      const response = await fetch("/api/flights/search-natural", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });

      setSearchStage("processing");
      const data = await response.json();

      if (!response.ok || !data.success) {
        // Handle clarification needed
        if (data.needsClarification && data.clarificationQuestions) {
          setClarificationQuestions(data.clarificationQuestions);
          setError(data.error || "I need more information");
          return;
        }
        throw new Error(data.error || "Search failed");
      }

      setSearchStage("complete");
      const result = {
        searchId: data.data.searchId,
        flights: data.data.flights,
        carriers: data.data.dictionaries?.carriers,
        parsedQuery: data.data.parsedQuery,
        insight: data.data.insight,
      };
      setSearchResult(result);
      cacheResults(result, query);
      toast.success(`Found ${result.flights.length} flights`);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "An error occurred";
      setError(errorMsg);
      setSearchResult(null);
      toast.error("Search failed", { description: errorMsg });
    } finally {
      setIsLoading(false);
    }
  };

  // Refresh prices (re-run last query)
  const handleRefreshPrices = async () => {
    if (lastQuery) {
      await handleNaturalSearch(lastQuery);
    }
  };

  // Clear cached results
  const clearResults = () => {
    setSearchResult(null);
    setCachedAt(null);
    setLastQuery(null);
    sessionStorage.removeItem(CACHE_KEY);
  };

  // Save current search
  const handleSaveSearch = () => {
    if (!lastQuery || !searchResult) return;

    const parsed = searchResult.parsedQuery;
    const saved = saveSearch({
      name: parsed
        ? `${parsed.origin.city} → ${parsed.destination.city}`
        : lastQuery.slice(0, 50),
      query: lastQuery,
      origin: parsed?.origin.iataCode,
      destination: parsed?.destination.iataCode,
      departureDate: parsed?.dates.departure.date || undefined,
      returnDate: parsed?.dates.return?.date || undefined,
    });

    setSavedSearches(getSavedSearches());
    toast.success("Search saved", { description: saved.name });
  };

  // Delete saved search
  const handleDeleteSavedSearch = (id: string) => {
    deleteSavedSearch(id);
    setSavedSearches(getSavedSearches());
    toast.success("Search removed");
  };

  // Run saved search
  const handleRunSavedSearch = async (search: SavedSearch) => {
    await handleNaturalSearch(search.query);
  };

  // Create task from saved search
  const handleCreateTaskFromSaved = (search: SavedSearch) => {
    sessionStorage.setItem(
      "createTaskFrom",
      JSON.stringify({
        origin: search.origin,
        destination: search.destination,
        departureDate: search.departureDate,
        returnDate: search.returnDate,
        name: search.name,
      })
    );
    router.push("/tasks?create=true");
  };

  // Compare routes (multi-city search)
  const handleCompareRoutes = async (params: SearchParams) => {
    setIsComparingRoutes(true);
    setRouteComparison(null);

    try {
      const response = await fetch("/api/flights/compare-routes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          origin: params.origin.toUpperCase(),
          destination: params.destination.toUpperCase(),
          departureDate: params.departureDate,
          adults: params.adults,
          travelClass: params.travelClass,
          maxHubs: 3,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        console.error("Route comparison failed:", data.error);
        return;
      }

      setRouteComparison(data.data);
    } catch (err) {
      console.error("Route comparison error:", err);
    } finally {
      setIsComparingRoutes(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-10">
      {/* Hero Section */}
      <div className="text-center space-y-6 py-8 relative">
        {/* Decorative elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-1/4 w-64 h-64 bg-primary/5 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-48 h-48 bg-accent/5 rounded-full blur-3xl" />
        </div>

        <div className="relative">
          {/* Icon with animated rings */}
          <div className="hero-icon w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 mb-4 mx-auto border border-primary/10">
            <Plane className="w-9 h-9 text-primary animate-float" style={{ animationDelay: '0.5s' }} />
          </div>

          {/* Headline with gradient accent */}
          <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-semibold tracking-tight">
            <span className="text-gradient">Find Your</span>{" "}
            <span className="text-gradient-accent">Perfect Flight</span>
          </h1>

          {/* Subheadline */}
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mt-4 leading-relaxed">
            Search millions of flights with AI-powered natural language.
            <span className="hidden sm:inline"> Just describe your trip and let us find the best deals.</span>
          </p>

          {/* Trust indicators */}
          <div className="flex items-center justify-center gap-6 mt-6 text-sm text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
              <span>Real-time prices</span>
            </div>
            <div className="hidden sm:flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-primary" />
              <span>AI-powered search</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Bell className="w-4 h-4 text-primary" />
              <span>Price alerts</span>
            </div>
          </div>
        </div>
      </div>

      {/* Search Form */}
      <FlightSearchForm
        onSearch={handleSearch}
        onNaturalSearch={handleNaturalSearch}
        onCompareRoutes={handleCompareRoutes}
        isLoading={isLoading}
      />

      {/* Parsed Query Summary */}
      {searchResult?.parsedQuery && (
        <ParsedQuerySummary query={searchResult.parsedQuery} />
      )}

      {/* AI Insight */}
      {searchResult?.insight && (
        <Alert className="bg-primary/5 border-primary/20">
          <Sparkles className="h-4 w-4 text-primary" />
          <AlertTitle className="text-primary">AI Insight</AlertTitle>
          <AlertDescription>{searchResult.insight}</AlertDescription>
        </Alert>
      )}

      {/* Error Message */}
      {error && (
        <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive">
          <p className="font-medium">Search failed</p>
          <p className="text-sm mt-1">{error}</p>
          {clarificationQuestions.length > 0 && (
            <div className="mt-3">
              <p className="text-sm font-medium mb-2">Please clarify:</p>
              <ul className="list-disc list-inside text-sm space-y-1">
                {clarificationQuestions.map((q, i) => (
                  <li key={i}>{q}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Search Progress */}
      {isLoading && (
        <SearchProgress
          stage={searchStage}
          isNaturalLanguage={isNaturalLanguageSearch}
        />
      )}

      {/* Results */}
      {searchResult && !isLoading && (
        <div className="pt-4">
          {/* Cached results indicator */}
          {cachedAt && (
            <CachedResultsBanner
              cachedAt={cachedAt}
              onRefresh={handleRefreshPrices}
              onClear={clearResults}
              onSave={handleSaveSearch}
              canRefresh={!!lastQuery}
              canSave={!!lastQuery}
              isRefreshing={isLoading}
            />
          )}
          <FlightResultsList
            flights={searchResult.flights}
            carriers={searchResult.carriers}
            isLoading={false}
            searchId={searchResult.searchId}
          />
        </div>
      )}

      {/* Route Comparison */}
      {(isComparingRoutes || routeComparison) && (
        <div className="pt-4">
          <Separator className="mb-6" />
          {isComparingRoutes ? (
            <RouteComparisonSkeleton />
          ) : routeComparison ? (
            <RouteComparison
              directRoute={routeComparison.directRoute}
              stopoverRoutes={routeComparison.stopoverRoutes}
              bestRoute={routeComparison.bestRoute}
            />
          ) : null}
        </div>
      )}

      {/* Saved Searches - Show when there are saved searches */}
      {!isLoading && savedSearches.length > 0 && (
        <SavedSearchesSection
          searches={savedSearches}
          onRun={handleRunSavedSearch}
          onDelete={handleDeleteSavedSearch}
          onCreateTask={handleCreateTaskFromSaved}
          isLoading={isLoading}
        />
      )}

      {/* Feature Cards - Show when no results */}
      {!searchResult && !isLoading && (
        <div className="pt-12 pb-4">
          {/* Section header */}
          <div className="text-center mb-8">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2">Why Choose Voyager</p>
            <h2 className="font-display text-2xl font-semibold">Smarter Flight Search</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <FeatureCard
              icon={<Compass className="w-6 h-6" />}
              title="Natural Language"
              description="Just describe your trip naturally - dates, destinations, budget, flexibility - and AI will understand"
              accentColor="primary"
            />
            <FeatureCard
              icon={<Route className="w-6 h-6" />}
              title="Multi-City Routes"
              description="Get suggestions for creative routes through stopover cities that could save you money"
              accentColor="accent"
            />
            <FeatureCard
              icon={<Bell className="w-6 h-6" />}
              title="Price Tracking"
              description="Set up scheduled searches and get notified when prices drop or availability changes"
              accentColor="sage"
            />
          </div>
        </div>
      )}
    </div>
  );
}

function ParsedQuerySummary({ query }: { query: ParsedTravelQuery }) {
  return (
    <Alert className="bg-muted/50 border-border">
      <Info className="h-4 w-4" />
      <AlertTitle>Search Understood</AlertTitle>
      <AlertDescription>
        <div className="flex flex-wrap gap-2 mt-2">
          <Badge variant="secondary">
            {query.origin.city} → {query.destination.city}
          </Badge>
          {query.dates.departure.date && (
            <Badge variant="outline">
              Departure: {query.dates.departure.date}
            </Badge>
          )}
          {query.dates.return?.date && (
            <Badge variant="outline">
              Return: {query.dates.return.date}
            </Badge>
          )}
          {query.dates.return?.durationWeeks && (
            <Badge variant="outline">
              {query.dates.return.durationWeeks} weeks
            </Badge>
          )}
          {query.preferences.maxBudget && (
            <Badge variant="outline">
              Budget: ${query.preferences.maxBudget}
            </Badge>
          )}
          <Badge variant="outline">
            {query.passengers.adults} adult{query.passengers.adults > 1 ? "s" : ""}
          </Badge>
          <Badge variant="outline" className="capitalize">
            {query.preferences.cabinClass.toLowerCase().replace("_", " ")}
          </Badge>
          {query.preferences.flexibleDates && (
            <Badge className="bg-accent text-accent-foreground">
              Flexible dates
            </Badge>
          )}
        </div>
        {query.confidence.overall < 0.8 && (
          <p className="text-xs text-muted-foreground mt-2">
            Confidence: {Math.round(query.confidence.overall * 100)}%
          </p>
        )}
      </AlertDescription>
    </Alert>
  );
}

function FeatureCard({
  icon,
  title,
  description,
  accentColor = "primary",
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  accentColor?: "primary" | "accent" | "sage";
}) {
  const colorClasses = {
    primary: "from-primary/10 to-primary/5 text-primary border-primary/10",
    accent: "from-accent/10 to-accent/5 text-accent border-accent/10",
    sage: "from-sage/10 to-sage/5 text-sage border-sage/10",
  };

  return (
    <Card className="feature-card border-border/50 group">
      <CardHeader className="pb-3">
        <div className={`inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br ${colorClasses[accentColor]} mb-4 border transition-transform duration-300 group-hover:scale-110`}>
          {icon}
        </div>
        <CardTitle className="font-display text-xl tracking-tight">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {description}
        </p>
      </CardContent>
    </Card>
  );
}

function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diffMs = now - timestamp;
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return "just now";
  if (diffMins === 1) return "1 minute ago";
  if (diffMins < 60) return `${diffMins} minutes ago`;

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours === 1) return "1 hour ago";
  return `${diffHours} hours ago`;
}

function CachedResultsBanner({
  cachedAt,
  onRefresh,
  onClear,
  onSave,
  canRefresh,
  canSave,
  isRefreshing,
}: {
  cachedAt: number;
  onRefresh: () => void;
  onClear: () => void;
  onSave: () => void;
  canRefresh: boolean;
  canSave: boolean;
  isRefreshing: boolean;
}) {
  const [timeAgo, setTimeAgo] = useState(formatRelativeTime(cachedAt));

  // Update time ago every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeAgo(formatRelativeTime(cachedAt));
    }, 60000);
    return () => clearInterval(interval);
  }, [cachedAt]);

  return (
    <div className="flex items-center justify-between py-3 px-4 mb-4 rounded-lg bg-muted/50 border border-border">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Clock className="h-4 w-4" />
        <span>Results from {timeAgo}</span>
      </div>
      <div className="flex items-center gap-2">
        {canSave && (
          <Button variant="outline" size="sm" onClick={onSave}>
            <Bookmark className="h-4 w-4 mr-1.5" />
            Save Search
          </Button>
        )}
        {canRefresh && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-1.5 ${isRefreshing ? "animate-spin" : ""}`} />
            Refresh Prices
          </Button>
        )}
        <Button variant="ghost" size="sm" onClick={onClear}>
          Clear
        </Button>
      </div>
    </div>
  );
}

interface ComparisonResult {
  search: SavedSearch;
  cheapestPrice: number | null;
  fastestDuration: number | null; // in minutes
  directAvailable: boolean;
  airlines: string[];
  error?: string;
  isLoading: boolean;
}

function SavedSearchesSection({
  searches,
  onRun,
  onDelete,
  onCreateTask,
  isLoading,
}: {
  searches: SavedSearch[];
  onRun: (search: SavedSearch) => void;
  onDelete: (id: string) => void;
  onCreateTask: (search: SavedSearch) => void;
  isLoading: boolean;
}) {
  const [selectedForCompare, setSelectedForCompare] = useState<Set<string>>(new Set());
  const [isComparing, setIsComparing] = useState(false);
  const [comparisonResults, setComparisonResults] = useState<ComparisonResult[] | null>(null);

  const toggleCompare = (id: string) => {
    setSelectedForCompare((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else if (next.size < 3) {
        next.add(id);
      } else {
        toast.error("Maximum 3 searches can be compared");
      }
      return next;
    });
  };

  const runComparison = async () => {
    const selectedSearches = searches.filter((s) => selectedForCompare.has(s.id));
    if (selectedSearches.length < 2) {
      toast.error("Select at least 2 searches to compare");
      return;
    }

    setIsComparing(true);
    setComparisonResults(
      selectedSearches.map((search) => ({
        search,
        cheapestPrice: null,
        fastestDuration: null,
        directAvailable: false,
        airlines: [],
        isLoading: true,
      }))
    );

    // Run all searches in parallel
    const results = await Promise.all(
      selectedSearches.map(async (search) => {
        try {
          const response = await fetch("/api/flights/search-natural", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ query: search.query }),
          });

          const data = await response.json();

          if (!response.ok || !data.success || !data.data.flights?.length) {
            return {
              search,
              cheapestPrice: null,
              fastestDuration: null,
              directAvailable: false,
              airlines: [],
              error: data.error || "No flights found",
              isLoading: false,
            };
          }

          const flights = data.data.flights as NormalizedFlight[];
          const cheapest = Math.min(...flights.map((f) => f.price));
          const durations = flights.map((f) => {
            const match = f.totalDuration?.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
            if (!match) return Infinity;
            return (parseInt(match[1] || "0") * 60) + parseInt(match[2] || "0");
          });
          const fastest = Math.min(...durations.filter((d) => d !== Infinity));
          const hasDirects = flights.some((f) => f.legs[0]?.stops === 0);
          const allAirlines = new Set<string>();
          flights.forEach((f) => f.airlines.forEach((a) => allAirlines.add(a)));

          return {
            search,
            cheapestPrice: cheapest,
            fastestDuration: fastest === Infinity ? null : fastest,
            directAvailable: hasDirects,
            airlines: Array.from(allAirlines).slice(0, 5),
            isLoading: false,
          };
        } catch (error) {
          return {
            search,
            cheapestPrice: null,
            fastestDuration: null,
            directAvailable: false,
            airlines: [],
            error: error instanceof Error ? error.message : "Search failed",
            isLoading: false,
          };
        }
      })
    );

    setComparisonResults(results);
    setIsComparing(false);
    toast.success("Comparison complete");
  };

  const clearComparison = () => {
    setComparisonResults(null);
    setSelectedForCompare(new Set());
  };

  // Find best values for highlighting
  const bestPrice = comparisonResults
    ? Math.min(...comparisonResults.filter((r) => r.cheapestPrice).map((r) => r.cheapestPrice!))
    : null;
  const bestDuration = comparisonResults
    ? Math.min(...comparisonResults.filter((r) => r.fastestDuration).map((r) => r.fastestDuration!))
    : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg font-semibold flex items-center gap-2">
          <Bookmark className="h-5 w-5" />
          Saved Searches
        </h2>
        <div className="flex items-center gap-2">
          {selectedForCompare.size >= 2 && (
            <Button
              size="sm"
              onClick={runComparison}
              disabled={isComparing}
            >
              {isComparing ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                  Comparing...
                </>
              ) : (
                <>
                  <GitCompare className="h-3.5 w-3.5 mr-1.5" />
                  Compare ({selectedForCompare.size})
                </>
              )}
            </Button>
          )}
          <span className="text-sm text-muted-foreground">
            {searches.length} saved
          </span>
        </div>
      </div>

      {/* Comparison Results */}
      {comparisonResults && (
        <div className="p-4 rounded-lg border border-border bg-card space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold flex items-center gap-2">
              <GitCompare className="h-4 w-4" />
              Comparison Results
            </h3>
            <Button variant="ghost" size="sm" onClick={clearComparison}>
              <X className="h-4 w-4 mr-1" />
              Clear
            </Button>
          </div>

          <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${comparisonResults.length}, 1fr)` }}>
            {comparisonResults.map((result) => (
              <div
                key={result.search.id}
                className="p-4 rounded-lg border border-border bg-muted/30 space-y-3"
              >
                <div>
                  <h4 className="font-medium truncate">{result.search.name}</h4>
                  <p className="text-xs text-muted-foreground truncate">{result.search.query}</p>
                </div>

                {result.isLoading ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : result.error ? (
                  <p className="text-sm text-destructive">{result.error}</p>
                ) : (
                  <div className="space-y-2">
                    {/* Price */}
                    <div className={`flex items-center justify-between p-2 rounded ${result.cheapestPrice === bestPrice ? "bg-green-500/10 border border-green-500/30" : ""}`}>
                      <span className="text-sm text-muted-foreground flex items-center gap-1">
                        {result.cheapestPrice === bestPrice && <Trophy className="h-3.5 w-3.5 text-green-500" />}
                        Cheapest
                      </span>
                      <span className={`font-semibold ${result.cheapestPrice === bestPrice ? "text-green-500" : ""}`}>
                        ${result.cheapestPrice ? Math.round(result.cheapestPrice) : "N/A"}
                      </span>
                    </div>

                    {/* Duration */}
                    <div className={`flex items-center justify-between p-2 rounded ${result.fastestDuration === bestDuration ? "bg-blue-500/10 border border-blue-500/30" : ""}`}>
                      <span className="text-sm text-muted-foreground flex items-center gap-1">
                        {result.fastestDuration === bestDuration && <Trophy className="h-3.5 w-3.5 text-blue-500" />}
                        Fastest
                      </span>
                      <span className={`font-semibold ${result.fastestDuration === bestDuration ? "text-blue-500" : ""}`}>
                        {result.fastestDuration
                          ? `${Math.floor(result.fastestDuration / 60)}h ${result.fastestDuration % 60}m`
                          : "N/A"}
                      </span>
                    </div>

                    {/* Direct */}
                    <div className="flex items-center justify-between p-2">
                      <span className="text-sm text-muted-foreground">Direct</span>
                      <Badge variant={result.directAvailable ? "default" : "secondary"}>
                        {result.directAvailable ? "Yes" : "No"}
                      </Badge>
                    </div>

                    {/* Airlines */}
                    {result.airlines.length > 0 && (
                      <div className="pt-2 border-t border-border">
                        <p className="text-xs text-muted-foreground mb-1">Airlines</p>
                        <div className="flex flex-wrap gap-1">
                          {result.airlines.map((a) => (
                            <Badge key={a} variant="outline" className="text-xs">
                              {a}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <Button
                  size="sm"
                  className="w-full mt-2"
                  onClick={() => onRun(result.search)}
                  disabled={isLoading}
                >
                  <ArrowRight className="h-3.5 w-3.5 mr-1" />
                  View Details
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Saved Search Cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {searches.map((search) => (
          <Card
            key={search.id}
            className={`group relative transition-all ${selectedForCompare.has(search.id) ? "ring-2 ring-primary" : ""}`}
          >
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                {/* Compare Checkbox */}
                <Checkbox
                  checked={selectedForCompare.has(search.id)}
                  onCheckedChange={() => toggleCompare(search.id)}
                  className="mt-1"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium truncate">{search.name}</h3>
                      <p className="text-xs text-muted-foreground mt-1 truncate">
                        {search.query}
                      </p>
                      {search.departureDate && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(search.departureDate).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })}
                          {search.returnDate && (
                            <>
                              {" → "}
                              {new Date(search.returnDate).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                              })}
                            </>
                          )}
                        </p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => onDelete(search.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex items-center gap-2 mt-3">
                    <Button
                      size="sm"
                      className="flex-1"
                      onClick={() => onRun(search)}
                      disabled={isLoading}
                    >
                      <Play className="h-3.5 w-3.5 mr-1" />
                      Search
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onCreateTask(search)}
                    >
                      <Bell className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Helper text */}
      {searches.length >= 2 && selectedForCompare.size === 0 && !comparisonResults && (
        <p className="text-xs text-muted-foreground text-center">
          Select 2-3 searches to compare prices and options side by side
        </p>
      )}
    </div>
  );
}
