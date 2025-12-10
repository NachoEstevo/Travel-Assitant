"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Plane,
  Clock,
  DollarSign,
  TrendingDown,
  AlertTriangle,
  ArrowRight,
  MapPin,
  Star
} from "lucide-react";
import { cn } from "@/lib/utils";
import { MultiCityRoute } from "@/lib/multi-city";
import { formatDuration } from "@/lib/amadeus";

interface RouteComparisonProps {
  directRoute: MultiCityRoute | null;
  stopoverRoutes: MultiCityRoute[];
  bestRoute: MultiCityRoute | null;
  onSelectRoute?: (route: MultiCityRoute) => void;
}

export function RouteComparison({
  directRoute,
  stopoverRoutes,
  bestRoute,
  onSelectRoute,
}: RouteComparisonProps) {
  const allRoutes = [
    ...(directRoute ? [directRoute] : []),
    ...stopoverRoutes,
  ].sort((a, b) => b.score - a.score);

  if (allRoutes.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-12 text-center">
          <Plane className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
          <p className="text-muted-foreground">No routes found for this search.</p>
          <p className="text-sm text-muted-foreground mt-1">
            Try different dates or destinations.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-display text-lg font-semibold">Route Comparison</h3>
          <p className="text-sm text-muted-foreground">
            {allRoutes.length} route{allRoutes.length !== 1 ? "s" : ""} found
            {stopoverRoutes.length > 0 && ` • ${stopoverRoutes.length} with stopovers`}
          </p>
        </div>
        {bestRoute?.savingsPercent && bestRoute.savingsPercent > 0 && (
          <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
            <TrendingDown className="h-3 w-3 mr-1" />
            Up to {bestRoute.savingsPercent}% savings
          </Badge>
        )}
      </div>

      {/* Route Cards */}
      <div className="space-y-3">
        {allRoutes.map((route, index) => (
          <RouteCard
            key={route.id}
            route={route}
            isBest={route.id === bestRoute?.id}
            rank={index + 1}
            directPrice={directRoute?.totalPrice}
            onSelect={onSelectRoute}
          />
        ))}
      </div>
    </div>
  );
}

interface RouteCardProps {
  route: MultiCityRoute;
  isBest: boolean;
  rank: number;
  directPrice?: number;
  onSelect?: (route: MultiCityRoute) => void;
}

function RouteCard({ route, isBest, rank, directPrice, onSelect }: RouteCardProps) {
  const isDirect = route.type === "direct";

  return (
    <Card
      className={cn(
        "transition-all hover:shadow-md",
        isBest && "ring-2 ring-primary/50 bg-primary/5"
      )}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          {/* Route Info */}
          <div className="flex-1 space-y-3">
            {/* Header with badges */}
            <div className="flex items-center gap-2 flex-wrap">
              {isBest && (
                <Badge className="bg-primary text-primary-foreground">
                  <Star className="h-3 w-3 mr-1" />
                  Best Value
                </Badge>
              )}
              {isDirect ? (
                <Badge variant="secondary">Direct Flight</Badge>
              ) : (
                <Badge variant="outline">
                  <MapPin className="h-3 w-3 mr-1" />
                  Via {route.stopoverHub?.city}
                </Badge>
              )}
              {route.savingsPercent && route.savingsPercent > 0 && (
                <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
                  Save {route.savingsPercent}%
                </Badge>
              )}
            </div>

            {/* Route Path */}
            <div className="flex items-center gap-2 text-sm">
              {route.segments.map((segment, i) => (
                <div key={i} className="flex items-center gap-2">
                  {i > 0 && (
                    <div className="flex items-center text-muted-foreground">
                      <ArrowRight className="h-4 w-4" />
                    </div>
                  )}
                  <span className="font-mono font-semibold">{segment.origin}</span>
                  {i === route.segments.length - 1 && (
                    <>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      <span className="font-mono font-semibold">{segment.destination}</span>
                    </>
                  )}
                </div>
              ))}
            </div>

            {/* Details */}
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                <span>{route.totalDuration}</span>
              </div>
              {route.layoverDuration && (
                <div className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  <span>{route.layoverDuration}</span>
                </div>
              )}
              {!isDirect && route.segments.length > 0 && (
                <span>{route.segments.length} separate bookings</span>
              )}
            </div>

            {/* Warnings */}
            {route.warnings && route.warnings.length > 0 && (
              <div className="flex items-start gap-2 text-xs text-amber-600">
                <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                <span>{route.warnings.join(" • ")}</span>
              </div>
            )}

            {/* Flight Details per segment */}
            {!isDirect && (
              <div className="pt-2 space-y-2">
                <Separator />
                {route.segments.map((segment, i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-mono">
                        {segment.origin} → {segment.destination}
                      </span>
                      {segment.bestFlight && (
                        <span className="text-muted-foreground">
                          {segment.bestFlight.airlines.join(", ")} •
                          {formatDuration(segment.bestFlight.legs[0].duration)}
                        </span>
                      )}
                    </div>
                    {segment.bestFlight && (
                      <span className="font-semibold">
                        ${Math.round(segment.bestFlight.price)}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Price & Action */}
          <div className="text-right space-y-2 flex-shrink-0">
            <div>
              <div className="font-display text-2xl font-semibold">
                ${Math.round(route.totalPrice)}
              </div>
              <div className="text-xs text-muted-foreground">
                {route.currency} total
              </div>
              {route.savingsVsDirect && route.savingsVsDirect > 0 && (
                <div className="text-xs text-green-600 font-medium">
                  Save ${Math.round(route.savingsVsDirect)}
                </div>
              )}
            </div>

            {onSelect && (
              <Button
                size="sm"
                variant={isBest ? "default" : "outline"}
                onClick={() => onSelect(route)}
              >
                Select
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Skeleton for loading state
export function RouteComparisonSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-5 w-40 bg-muted rounded animate-pulse" />
          <div className="h-4 w-32 bg-muted rounded animate-pulse" />
        </div>
      </div>
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-3">
                  <div className="flex gap-2">
                    <div className="h-5 w-20 bg-muted rounded" />
                    <div className="h-5 w-24 bg-muted rounded" />
                  </div>
                  <div className="h-4 w-48 bg-muted rounded" />
                  <div className="h-4 w-36 bg-muted rounded" />
                </div>
                <div className="text-right space-y-2">
                  <div className="h-8 w-20 bg-muted rounded" />
                  <div className="h-4 w-16 bg-muted rounded" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
