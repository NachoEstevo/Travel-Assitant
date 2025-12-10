"use client";

import { useState, useEffect } from "react";
import {
  FlightSearchForm,
  FlightResultsList,
  RouteComparison,
  RouteComparisonSkeleton,
} from "@/components/flights";
import { NormalizedFlight } from "@/lib/amadeus";
import { MultiCitySearchResult } from "@/lib/multi-city";
import { ParsedTravelQuery } from "@/lib/openai";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Compass, Route, Bell, Plane, Sparkles, Info } from "lucide-react";

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
  const [isLoading, setIsLoading] = useState(false);
  const [isComparingRoutes, setIsComparingRoutes] = useState(false);
  const [searchResult, setSearchResult] = useState<SearchResult | null>(null);
  const [routeComparison, setRouteComparison] = useState<MultiCitySearchResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [clarificationQuestions, setClarificationQuestions] = useState<string[]>([]);

  // Load re-run search results from history page
  useEffect(() => {
    const rerunData = sessionStorage.getItem("rerunSearch");
    if (rerunData) {
      try {
        const data = JSON.parse(rerunData);
        setSearchResult({
          searchId: data.searchId,
          flights: data.flights,
          carriers: data.carriers,
          parsedQuery: data.parsedQuery,
          insight: data.insight,
        });
      } catch (e) {
        console.error("Failed to parse rerun search data:", e);
      }
      sessionStorage.removeItem("rerunSearch");
    }
  }, []);

  // Manual structured search
  const handleSearch = async (params: SearchParams) => {
    setIsLoading(true);
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

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Search failed");
      }

      setSearchResult({
        searchId: data.data.searchId,
        flights: data.data.flights,
        carriers: data.data.dictionaries?.carriers,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setSearchResult(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Natural language search
  const handleNaturalSearch = async (query: string) => {
    setIsLoading(true);
    setError(null);
    setClarificationQuestions([]);

    try {
      const response = await fetch("/api/flights/search-natural", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });

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

      setSearchResult({
        searchId: data.data.searchId,
        flights: data.data.flights,
        carriers: data.data.dictionaries?.carriers,
        parsedQuery: data.data.parsedQuery,
        insight: data.data.insight,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setSearchResult(null);
    } finally {
      setIsLoading(false);
    }
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
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Hero Section */}
      <div className="text-center space-y-4 py-6">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-2">
          <Plane className="w-8 h-8 text-primary animate-plane" />
        </div>
        <h1 className="font-display text-4xl md:text-5xl font-semibold tracking-tight">
          Find Your Flight
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Search millions of flights to find the best deals. Describe your trip naturally or use our manual search.
        </p>
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

      {/* Results */}
      {(isLoading || searchResult) && (
        <div className="pt-4">
          <FlightResultsList
            flights={searchResult?.flights || []}
            carriers={searchResult?.carriers}
            isLoading={isLoading}
            searchId={searchResult?.searchId}
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

      {/* Feature Cards - Show when no results */}
      {!searchResult && !isLoading && (
        <div className="grid md:grid-cols-3 gap-6 pt-8">
          <FeatureCard
            icon={<Compass className="w-6 h-6" />}
            title="Natural Language"
            description="Just describe your trip naturally - dates, destinations, budget, flexibility - and AI will understand"
          />
          <FeatureCard
            icon={<Route className="w-6 h-6" />}
            title="Multi-City Routes"
            description="Get suggestions for creative routes through stopover cities that could save you money"
          />
          <FeatureCard
            icon={<Bell className="w-6 h-6" />}
            title="Price Tracking"
            description="Set up scheduled searches and get notified when prices drop or availability changes"
          />
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
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <Card className="card-hover border-border/50">
      <CardHeader className="pb-2">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-muted mb-3 text-primary">
          {icon}
        </div>
        <CardTitle className="font-display text-xl">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {description}
        </p>
      </CardContent>
    </Card>
  );
}
