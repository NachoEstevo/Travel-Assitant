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
import { Plane, Clock, Circle, ExternalLink, Bell, BellRing, Copy, CalendarPlus, Share2, MoreHorizontal, Check, Sparkles } from "lucide-react";
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
 */
function generateGoogleFlightsUrl(flight: NormalizedFlight): string {
  const outbound = flight.legs[0];
  const returnLeg = flight.legs[1];

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
  const isDirect = outboundLeg.stops === 0 && (!returnLeg || returnLeg.stops === 0);

  return (
    <div
      className={`animate-slide-up ${staggerClass} card-hover group relative overflow-hidden rounded-2xl gradient-card shadow-sm border border-border/60 hover:shadow-xl transition-all duration-500`}
    >
      {/* Premium corner accent */}
      <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-primary/5 to-transparent pointer-events-none" />

      {/* Boarding pass notches */}
      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-6 h-12 bg-background rounded-r-full -ml-3 z-10" style={{ boxShadow: 'inset -2px 0 4px rgba(0,0,0,0.03)' }} />
      <div className="absolute right-0 top-1/2 -translate-y-1/2 w-6 h-12 bg-background rounded-l-full -mr-3 z-10" style={{ boxShadow: 'inset 2px 0 4px rgba(0,0,0,0.03)' }} />

      <div className="flex">
        {/* Main flight info section */}
        <div className="flex-1 p-6">
          {/* Header: Airlines + badges */}
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2 flex-wrap">
              {flight.airlines.map((airline) => (
                <Badge
                  key={airline}
                  variant="secondary"
                  className="font-medium text-xs bg-muted/70 hover:bg-muted transition-colors px-3 py-1"
                >
                  {getAirlineName(airline)}
                </Badge>
              ))}
            </div>
            <div className="flex items-center gap-2">
              {isDirect && (
                <Badge className="bg-accent/10 text-accent border-accent/20 text-xs font-medium px-2.5">
                  <Sparkles className="w-3 h-3 mr-1" />
                  Direct
                </Badge>
              )}
              {flight.isOneWay && (
                <Badge variant="outline" className="text-xs border-dashed">
                  One Way
                </Badge>
              )}
            </div>
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
              <div className="my-5 flex items-center gap-4">
                <div className="flex-1 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
                <span className="text-[10px] uppercase tracking-widest text-muted-foreground/70 font-medium">Return</span>
                <div className="flex-1 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
              </div>
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
        <div className="w-px my-6 relative">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-border/50 to-transparent" />
          <div className="absolute inset-0" style={{
            backgroundImage: 'repeating-linear-gradient(to bottom, var(--color-border) 0px, var(--color-border) 4px, transparent 4px, transparent 12px)',
          }} />
        </div>

        {/* Price section */}
        <div className="w-44 p-6 flex flex-col items-center justify-center relative bg-gradient-to-br from-muted/5 via-transparent to-muted/20">
          {/* Decorative circle */}
          <div className="absolute -top-8 -right-8 w-24 h-24 rounded-full bg-gradient-to-br from-primary/5 to-transparent" />

          <span className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground mb-2 font-medium">
            Total Price
          </span>

          <div className="relative">
            <div className="font-display text-4xl font-semibold text-primary tabular-nums tracking-tight">
              <span className="text-2xl align-top">$</span>
              {Math.round(flight.price).toLocaleString()}
            </div>
            {/* Subtle glow effect */}
            <div className="absolute inset-0 blur-xl bg-primary/10 -z-10 scale-150 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          </div>

          <span className="text-[10px] text-muted-foreground/70 mt-1 uppercase tracking-wider">
            {flight.currency}
          </span>

          {flight.bookableSeats <= 4 && (
            <Badge
              variant="destructive"
              className="mt-3 text-xs font-medium animate-pulse"
            >
              Only {flight.bookableSeats} left
            </Badge>
          )}

          <Button
            asChild
            className="mt-5 w-full btn-press btn-premium shadow-md hover:shadow-lg transition-all"
            size="sm"
          >
            <a
              href={generateGoogleFlightsUrl(flight)}
              target="_blank"
              rel="noopener noreferrer"
            >
              Book Now
              <ExternalLink className="ml-2 h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </a>
          </Button>

          {/* Price Alert Button */}
          <Popover open={isAlertOpen} onOpenChange={setIsAlertOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="mt-2.5 w-full btn-press hover:border-primary/40 hover:bg-primary/5 transition-all"
              >
                <Bell className="h-3.5 w-3.5 mr-2" />
                Set Alert
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72 glass shadow-xl border-border/50" align="end">
              <div className="space-y-4">
                <div className="space-y-2">
                  <h4 className="font-semibold flex items-center gap-2">
                    <BellRing className="h-4 w-4 text-primary" />
                    Price Alert
                  </h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Get notified when this route drops below your target price.
                  </p>
                </div>
                <div className="space-y-3">
                  <Label htmlFor="target-price" className="text-sm font-medium">
                    Alert when below
                  </Label>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground font-medium">$</span>
                    <Input
                      id="target-price"
                      type="number"
                      value={targetPrice}
                      onChange={(e) => setTargetPrice(e.target.value)}
                      className="flex-1 input-premium"
                      placeholder="Target price"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40" />
                    Current price: ${Math.round(flight.price)}
                  </p>
                </div>
                <Button
                  className="w-full btn-press"
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
      <div className="px-6 py-3 bg-gradient-to-r from-muted/40 via-muted/20 to-muted/40 border-t border-border/50 flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <Clock className="w-3 h-3" />
            Book by {new Date(flight.lastTicketingDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          </span>
          <span className="font-mono text-[10px] opacity-60">{flight.id}</span>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 -mr-2 hover:bg-muted"
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={handleCopy} className="cursor-pointer">
              {copied ? (
                <Check className="h-4 w-4 mr-2 text-green-500" />
              ) : (
                <Copy className="h-4 w-4 mr-2" />
              )}
              {copied ? "Copied!" : "Copy details"}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleAddToCalendar} className="cursor-pointer">
              <CalendarPlus className="h-4 w-4 mr-2" />
              Add to calendar
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleShare} className="cursor-pointer">
              <Share2 className="h-4 w-4 mr-2" />
              Share
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
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

function FlightLeg({ leg, formatTime, formatDate }: FlightLegProps) {
  return (
    <div className="group/leg">
      <div className="flex items-center gap-6">
        {/* Departure */}
        <div className="text-center min-w-[80px]">
          <div className="font-display text-3xl font-semibold tracking-tight">
            {formatTime(leg.departureAt)}
          </div>
          <div className="text-lg font-bold tracking-wide mt-0.5">{leg.origin}</div>
          <div className="text-xs text-muted-foreground mt-1">
            {formatDate(leg.departureAt)}
          </div>
        </div>

        {/* Flight path visualization */}
        <div className="flex-1 flex flex-col items-center gap-2 px-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
            <Clock className="w-3.5 h-3.5" />
            {formatDuration(leg.duration)}
          </div>
          <div className="w-full flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-primary/20 border-2 border-primary" />
            <div className="flex-1 h-[2px] bg-gradient-to-r from-primary/60 via-primary/30 to-primary/60 relative rounded-full">
              {/* Stops indicator */}
              {leg.stops > 0 && (
                <div className="absolute inset-0 flex items-center justify-around">
                  {Array.from({ length: leg.stops }).map((_, i) => (
                    <div
                      key={i}
                      className="w-2 h-2 rounded-full bg-muted-foreground/40 border-2 border-card ring-2 ring-card"
                    />
                  ))}
                </div>
              )}
              {/* Animated plane */}
              <Plane className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 text-primary animate-plane" />
            </div>
            <div className="w-2.5 h-2.5 rounded-full bg-primary" />
          </div>
          <div className="text-xs">
            {leg.stops === 0 ? (
              <span className="text-accent font-semibold">Non-stop</span>
            ) : (
              <span className="text-muted-foreground">
                {leg.stops} stop{leg.stops > 1 ? "s" : ""}
              </span>
            )}
          </div>
        </div>

        {/* Arrival */}
        <div className="text-center min-w-[80px]">
          <div className="font-display text-3xl font-semibold tracking-tight">
            {formatTime(leg.arrivalAt)}
          </div>
          <div className="text-lg font-bold tracking-wide mt-0.5">{leg.destination}</div>
          <div className="text-xs text-muted-foreground mt-1">
            {formatDate(leg.arrivalAt)}
          </div>
        </div>
      </div>

      {/* Segments preview */}
      {leg.segments.length > 1 && (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {leg.segments.map((seg, i) => (
            <span
              key={i}
              className="text-xs text-muted-foreground bg-muted/60 px-2.5 py-1 rounded-md font-medium"
            >
              {seg.flightNumber} · {seg.origin}→{seg.destination}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
