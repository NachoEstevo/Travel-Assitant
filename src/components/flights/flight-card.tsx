"use client";

import { useState } from "react";
import { NormalizedFlight, formatDuration } from "@/lib/amadeus";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Plane, Clock, Circle, ExternalLink, Bell, BellRing, Copy, CalendarPlus, Share2, MoreHorizontal, Check } from "lucide-react";
import { toast } from "sonner";
import { copyToClipboard, downloadICS, shareNative } from "@/lib/flight-export";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/**
 * Generates a Google Flights search URL for the given flight.
 * Format: https://www.google.com/travel/flights?q=flights%20from%20EZE%20to%20NRT%20on%202025-02-20
 *
 * More structured format:
 * https://www.google.com/travel/flights/search?tfs=...
 * But the simple q= format works well for opening Google Flights with pre-filled search
 */
function generateGoogleFlightsUrl(flight: NormalizedFlight): string {
  const outbound = flight.legs[0];
  const returnLeg = flight.legs[1];

  // Format dates as YYYY-MM-DD
  const departureDate = new Date(outbound.departureAt).toISOString().split("T")[0];

  let query = `flights from ${outbound.origin} to ${outbound.destination} on ${departureDate}`;

  if (returnLeg) {
    const returnDate = new Date(returnLeg.departureAt).toISOString().split("T")[0];
    query += ` return ${returnDate}`;
  }

  return `https://www.google.com/travel/flights?q=${encodeURIComponent(query)}`;
}

interface FlightCardProps {
  flight: NormalizedFlight;
  carriers?: Record<string, string>;
  index?: number;
}

export function FlightCard({ flight, carriers, index = 0 }: FlightCardProps) {
  const outboundLeg = flight.legs[0];
  const returnLeg = flight.legs[1];
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [targetPrice, setTargetPrice] = useState(Math.round(flight.price * 0.9).toString());
  const [isCreatingAlert, setIsCreatingAlert] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const success = await copyToClipboard(flight);
    if (success) {
      setCopied(true);
      toast.success("Copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } else {
      toast.error("Failed to copy");
    }
  };

  const handleAddToCalendar = () => {
    downloadICS(flight);
    toast.success("Calendar file downloaded");
  };

  const handleShare = async () => {
    const shared = await shareNative(flight);
    if (!shared) {
      // Fallback to copy
      handleCopy();
    }
  };

  const handleCreateAlert = async () => {
    const price = parseFloat(targetPrice);
    if (isNaN(price) || price <= 0) {
      toast.error("Please enter a valid target price");
      return;
    }

    setIsCreatingAlert(true);
    try {
      const response = await fetch("/api/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          origin: outboundLeg.origin,
          destination: outboundLeg.destination,
          departureDate: outboundLeg.departureAt,
          returnDate: returnLeg?.departureAt,
          targetPrice: price,
          currentPrice: flight.price,
          currency: flight.currency,
          flightId: flight.id,
          airlines: flight.airlines,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to create alert");
      }

      toast.success("Price alert set!", {
        description: `We'll notify you when ${outboundLeg.origin}→${outboundLeg.destination} drops below $${price}`,
      });
      setIsAlertOpen(false);
    } catch (error) {
      toast.error("Failed to create alert", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsCreatingAlert(false);
    }
  };

  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  };

  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  const getAirlineName = (code: string) => {
    return carriers?.[code] || code;
  };

  const staggerClass = `stagger-${Math.min(index + 1, 10)}`;

  return (
    <div
      className={`animate-slide-up ${staggerClass} card-hover group relative overflow-hidden rounded-xl gradient-card shadow-sm border border-border/80 hover:shadow-lg transition-shadow duration-300`}
    >
      {/* Boarding pass notches */}
      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-5 h-10 bg-background rounded-r-full -ml-2.5 z-10 shadow-inner" />
      <div className="absolute right-0 top-1/2 -translate-y-1/2 w-5 h-10 bg-background rounded-l-full -mr-2.5 z-10 shadow-inner" />

      <div className="flex">
        {/* Main flight info section */}
        <div className="flex-1 p-5">
          {/* Airlines */}
          <div className="flex items-center gap-2 mb-4">
            {flight.airlines.map((airline) => (
              <Badge
                key={airline}
                variant="secondary"
                className="font-medium text-xs bg-muted/60 hover:bg-muted transition-colors"
              >
                {getAirlineName(airline)}
              </Badge>
            ))}
            {flight.isOneWay && (
              <Badge variant="outline" className="text-xs border-dashed">
                One Way
              </Badge>
            )}
          </div>

          {/* Outbound flight */}
          <FlightLeg
            leg={outboundLeg}
            formatTime={formatTime}
            formatDate={formatDate}
          />

          {/* Return flight if exists */}
          {returnLeg && (
            <>
              <div className="my-4 border-t border-dashed border-border" />
              <FlightLeg
                leg={returnLeg}
                formatTime={formatTime}
                formatDate={formatDate}
                isReturn
              />
            </>
          )}
        </div>

        {/* Perforation divider */}
        <div className="w-px perforation-vertical my-4" />

        {/* Price section */}
        <div className="w-40 p-5 flex flex-col items-center justify-center bg-gradient-to-br from-muted/10 to-muted/40 relative">
          {/* Subtle corner accent */}
          <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-primary/5 to-transparent rounded-bl-full" />

          <span className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5 font-medium">
            Total Price
          </span>
          <div className="font-display text-3xl font-semibold text-primary animate-price-glow rounded-lg px-2 tabular-nums">
            ${Math.round(flight.price).toLocaleString()}
          </div>
          <span className="text-[10px] text-muted-foreground mt-1 uppercase tracking-wide">
            {flight.currency}
          </span>

          {flight.bookableSeats <= 4 && (
            <Badge
              variant="destructive"
              className="mt-3 text-xs animate-pulse"
            >
              {flight.bookableSeats} left
            </Badge>
          )}

          <Button
            asChild
            className="mt-4 w-full btn-press shadow-sm hover:shadow-md transition-shadow"
            size="sm"
          >
            <a
              href={generateGoogleFlightsUrl(flight)}
              target="_blank"
              rel="noopener noreferrer"
            >
              Book Now
              <ExternalLink className="ml-1.5 h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </a>
          </Button>

          {/* Price Alert Button */}
          <Popover open={isAlertOpen} onOpenChange={setIsAlertOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="mt-2 w-full btn-press hover:border-primary/50 hover:bg-primary/5 transition-colors"
              >
                <Bell className="h-3.5 w-3.5 mr-1.5" />
                Set Alert
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 glass shadow-lg" align="end">
              <div className="space-y-4">
                <div className="space-y-2">
                  <h4 className="font-medium flex items-center gap-2">
                    <BellRing className="h-4 w-4" />
                    Price Alert
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    Get notified when this route drops below your target price.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="target-price" className="text-sm">
                    Alert when below
                  </Label>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">$</span>
                    <Input
                      id="target-price"
                      type="number"
                      value={targetPrice}
                      onChange={(e) => setTargetPrice(e.target.value)}
                      className="flex-1"
                      placeholder="Target price"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Current price: ${Math.round(flight.price)}
                  </p>
                </div>
                <Button
                  className="w-full"
                  size="sm"
                  onClick={handleCreateAlert}
                  disabled={isCreatingAlert}
                >
                  {isCreatingAlert ? "Creating..." : "Create Alert"}
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Bottom bar with meta info and actions */}
      <div className="px-5 py-2.5 bg-muted/30 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
        <span>
          Book by {new Date(flight.lastTicketingDate).toLocaleDateString()}
        </span>
        <div className="flex items-center gap-2">
          <span className="font-mono">{flight.id}</span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 -mr-2"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleCopy}>
                {copied ? (
                  <Check className="h-4 w-4 mr-2 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4 mr-2" />
                )}
                {copied ? "Copied!" : "Copy details"}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleAddToCalendar}>
                <CalendarPlus className="h-4 w-4 mr-2" />
                Add to calendar
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleShare}>
                <Share2 className="h-4 w-4 mr-2" />
                Share
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}

interface FlightLegProps {
  leg: NormalizedFlight["legs"][0];
  formatTime: (iso: string) => string;
  formatDate: (iso: string) => string;
  isReturn?: boolean;
}

function FlightLeg({ leg, formatTime, formatDate, isReturn }: FlightLegProps) {
  return (
    <div>
      {isReturn && (
        <span className="text-xs uppercase tracking-wider text-muted-foreground mb-2 block">
          Return
        </span>
      )}
      <div className="flex items-center gap-4">
        {/* Departure */}
        <div className="text-center min-w-[70px]">
          <div className="font-display text-2xl font-semibold">
            {formatTime(leg.departureAt)}
          </div>
          <div className="text-lg font-bold tracking-wide">{leg.origin}</div>
          <div className="text-xs text-muted-foreground">
            {formatDate(leg.departureAt)}
          </div>
        </div>

        {/* Flight path visualization */}
        <div className="flex-1 flex flex-col items-center gap-1 px-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="w-3 h-3" />
            {formatDuration(leg.duration)}
          </div>
          <div className="w-full flex items-center gap-1">
            <Circle className="w-2 h-2 fill-current text-primary" />
            <div className="flex-1 h-px bg-border relative">
              {/* Stops indicator */}
              {leg.stops > 0 && (
                <div className="absolute inset-0 flex items-center justify-around">
                  {Array.from({ length: leg.stops }).map((_, i) => (
                    <div
                      key={i}
                      className="w-2 h-2 rounded-full bg-muted-foreground/50 border-2 border-card"
                    />
                  ))}
                </div>
              )}
              {/* Animated plane */}
              <Plane className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 text-primary animate-plane" />
            </div>
            <Circle className="w-2 h-2 fill-current text-primary" />
          </div>
          <div className="text-xs text-muted-foreground">
            {leg.stops === 0 ? (
              <span className="text-accent font-medium">Direct</span>
            ) : (
              <span>
                {leg.stops} stop{leg.stops > 1 ? "s" : ""}
              </span>
            )}
          </div>
        </div>

        {/* Arrival */}
        <div className="text-center min-w-[70px]">
          <div className="font-display text-2xl font-semibold">
            {formatTime(leg.arrivalAt)}
          </div>
          <div className="text-lg font-bold tracking-wide">{leg.destination}</div>
          <div className="text-xs text-muted-foreground">
            {formatDate(leg.arrivalAt)}
          </div>
        </div>
      </div>

      {/* Segments preview */}
      {leg.segments.length > 1 && (
        <div className="mt-3 flex flex-wrap gap-1">
          {leg.segments.map((seg, i) => (
            <span
              key={i}
              className="text-xs text-muted-foreground bg-muted/50 px-2 py-0.5 rounded"
            >
              {seg.flightNumber} · {seg.origin}→{seg.destination}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
