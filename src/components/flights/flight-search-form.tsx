"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowRightLeft,
  Calendar,
  Users,
  Sparkles,
  Search,
  Loader2,
  Route,
  Plane,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { AirportSearch } from "./airport-search";

const structuredSearchSchema = z.object({
  origin: z.string().length(3, "Enter 3-letter airport code"),
  destination: z.string().length(3, "Enter 3-letter airport code"),
  departureDate: z.string().min(1, "Select departure date"),
  returnDate: z.string().optional(),
  adults: z.number().min(1).max(9),
  travelClass: z.enum(["ECONOMY", "PREMIUM_ECONOMY", "BUSINESS", "FIRST"]),
  flexibleDates: z.boolean().optional(),
});

type StructuredSearchForm = z.infer<typeof structuredSearchSchema>;

interface FlightSearchFormProps {
  onSearch: (params: StructuredSearchForm) => void;
  onNaturalSearch?: (query: string) => void;
  onCompareRoutes?: (params: StructuredSearchForm) => void;
  isLoading?: boolean;
}

export function FlightSearchForm({
  onSearch,
  onNaturalSearch,
  onCompareRoutes,
  isLoading,
}: FlightSearchFormProps) {
  const [naturalQuery, setNaturalQuery] = useState("");
  const [tripType, setTripType] = useState<"roundtrip" | "oneway">("roundtrip");
  const [compareRoutes, setCompareRoutes] = useState(false);

  const form = useForm<StructuredSearchForm>({
    resolver: zodResolver(structuredSearchSchema),
    defaultValues: {
      origin: "",
      destination: "",
      departureDate: "",
      returnDate: "",
      adults: 1,
      travelClass: "ECONOMY",
      flexibleDates: false,
    },
  });

  const handleStructuredSubmit = (data: StructuredSearchForm) => {
    const searchParams = {
      ...data,
      returnDate: tripType === "roundtrip" ? data.returnDate : undefined,
    };

    onSearch(searchParams);

    // Also trigger route comparison if enabled
    if (compareRoutes && onCompareRoutes && tripType === "oneway") {
      onCompareRoutes(searchParams);
    }
  };

  const handleNaturalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (naturalQuery.trim() && onNaturalSearch) {
      onNaturalSearch(naturalQuery);
    }
  };

  // Get tomorrow's date as min date
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = tomorrow.toISOString().split("T")[0];

  return (
    <Card className="overflow-hidden border-border/60 shadow-lg gradient-card">
      <Tabs defaultValue="natural" className="w-full">
        <div className="bg-gradient-to-r from-muted/40 to-muted/20 border-b border-border/50 px-6 pt-4">
          <TabsList className="grid w-full max-w-md grid-cols-2 bg-muted/60 p-1">
            <TabsTrigger
              value="natural"
              className="data-[state=active]:bg-card data-[state=active]:shadow-md transition-all duration-200"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Natural Language
            </TabsTrigger>
            <TabsTrigger
              value="structured"
              className="data-[state=active]:bg-card data-[state=active]:shadow-md transition-all duration-200"
            >
              <Search className="w-4 h-4 mr-2" />
              Manual Search
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Natural Language Search */}
        <TabsContent value="natural" className="m-0">
          <CardContent className="p-6">
            <form onSubmit={handleNaturalSubmit} className="space-y-5">
              <div className="space-y-3">
                <Label htmlFor="natural-query" className="text-base font-medium flex items-center gap-2">
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-semibold">AI</span>
                  Describe your trip
                </Label>
                <Textarea
                  id="natural-query"
                  value={naturalQuery}
                  onChange={(e) => setNaturalQuery(e.target.value)}
                  placeholder="I want to go to Japan in February for about 3 weeks, budget under $1500 from Buenos Aires. I'm flexible with exact dates."
                  className="min-h-[120px] resize-none text-base leading-relaxed border-border/60 focus:border-primary/50 transition-colors"
                  disabled={isLoading}
                />
                <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                  <span className="inline-block w-1 h-1 rounded-full bg-muted-foreground/50" />
                  Include your origin, destination, dates, budget, and any flexibility
                </p>
              </div>

              <div className="flex items-center gap-4">
                <Button
                  type="submit"
                  size="lg"
                  disabled={!naturalQuery.trim() || isLoading || !onNaturalSearch}
                  className="font-medium btn-press shadow-md hover:shadow-lg transition-shadow px-6"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Searching...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Find Flights
                    </>
                  )}
                </Button>
                {!onNaturalSearch && (
                  <p className="text-sm text-muted-foreground italic">
                    AI search coming soon - use manual search for now
                  </p>
                )}
              </div>
            </form>
          </CardContent>
        </TabsContent>

        {/* Structured Search */}
        <TabsContent value="structured" className="m-0">
          <CardContent className="p-6">
            <form
              onSubmit={form.handleSubmit(handleStructuredSubmit)}
              className="space-y-6"
            >
              {/* Trip type selector */}
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-4">
                  <Button
                    type="button"
                    variant={tripType === "roundtrip" ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      setTripType("roundtrip");
                      setCompareRoutes(false);
                    }}
                  >
                    <ArrowRightLeft className="w-4 h-4 mr-2" />
                    Round Trip
                  </Button>
                  <Button
                    type="button"
                    variant={tripType === "oneway" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setTripType("oneway")}
                  >
                    <Plane className="w-4 h-4 mr-2" />
                    One Way
                  </Button>
                </div>

                {/* Compare Routes toggle - only for one-way trips */}
                {tripType === "oneway" && onCompareRoutes && (
                  <div className="flex items-center gap-2">
                    <Switch
                      id="compare-routes"
                      checked={compareRoutes}
                      onCheckedChange={setCompareRoutes}
                      disabled={isLoading}
                    />
                    <Label
                      htmlFor="compare-routes"
                      className="text-sm font-medium flex items-center gap-1.5 cursor-pointer"
                    >
                      <Route className="w-4 h-4 text-primary" />
                      Compare Routes
                    </Label>
                  </div>
                )}
              </div>

              {/* Origin & Destination */}
              <div className="grid md:grid-cols-2 gap-4">
                <AirportSearch
                  id="origin"
                  label="From"
                  value={form.watch("origin")}
                  onChange={(code) => form.setValue("origin", code, { shouldValidate: true })}
                  placeholder="Search city or airport..."
                  disabled={isLoading}
                  iconRotation="-45deg"
                  error={form.formState.errors.origin?.message}
                />

                <AirportSearch
                  id="destination"
                  label="To"
                  value={form.watch("destination")}
                  onChange={(code) => form.setValue("destination", code, { shouldValidate: true })}
                  placeholder="Search city or airport..."
                  disabled={isLoading}
                  iconRotation="45deg"
                  error={form.formState.errors.destination?.message}
                />
              </div>

              {/* Dates */}
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="departureDate">Departure</Label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="departureDate"
                      type="date"
                      {...form.register("departureDate")}
                      min={minDate}
                      className="pl-10"
                      disabled={isLoading}
                    />
                  </div>
                  {form.formState.errors.departureDate && (
                    <p className="text-sm text-destructive">
                      {form.formState.errors.departureDate.message}
                    </p>
                  )}
                </div>

                {tripType === "roundtrip" && (
                  <div className="space-y-2">
                    <Label htmlFor="returnDate">Return</Label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="returnDate"
                        type="date"
                        {...form.register("returnDate")}
                        min={form.watch("departureDate") || minDate}
                        className="pl-10"
                        disabled={isLoading}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Flexible dates toggle */}
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border">
                <Switch
                  id="flexible-dates"
                  checked={form.watch("flexibleDates") || false}
                  onCheckedChange={(checked) =>
                    form.setValue("flexibleDates", checked)
                  }
                  disabled={isLoading}
                />
                <div className="flex-1">
                  <Label
                    htmlFor="flexible-dates"
                    className="font-medium cursor-pointer"
                  >
                    Flexible dates (±3 days)
                  </Label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Search nearby dates to find better prices
                  </p>
                </div>
              </div>

              {/* Passengers & Class */}
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="adults">Passengers</Label>
                  <div className="relative">
                    <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Select
                      value={form.watch("adults").toString()}
                      onValueChange={(v) =>
                        form.setValue("adults", parseInt(v))
                      }
                      disabled={isLoading}
                    >
                      <SelectTrigger className="pl-10">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                          <SelectItem key={n} value={n.toString()}>
                            {n} Adult{n > 1 ? "s" : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="travelClass">Class</Label>
                  <Select
                    value={form.watch("travelClass")}
                    onValueChange={(v) =>
                      form.setValue(
                        "travelClass",
                        v as StructuredSearchForm["travelClass"]
                      )
                    }
                    disabled={isLoading}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ECONOMY">Economy</SelectItem>
                      <SelectItem value="PREMIUM_ECONOMY">
                        Premium Economy
                      </SelectItem>
                      <SelectItem value="BUSINESS">Business</SelectItem>
                      <SelectItem value="FIRST">First Class</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button
                type="submit"
                size="lg"
                disabled={isLoading}
                className="w-full md:w-auto font-medium"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Searching...
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4 mr-2" />
                    Search Flights
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </TabsContent>
      </Tabs>
    </Card>
  );
}
