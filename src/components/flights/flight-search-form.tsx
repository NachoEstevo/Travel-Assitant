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
  Wand2,
  CalendarDays,
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
    <div>
      <Card className="overflow-hidden border-border/50 shadow-lg bg-card">
        <Tabs defaultValue="natural" className="w-full">
          {/* Tab Header */}
          <div className="relative bg-muted/30 border-b border-border/40 px-6 py-4">
            <TabsList className="relative grid w-full max-w-md grid-cols-2 bg-card p-1 shadow-sm border border-border/50 h-11">
              <TabsTrigger
                value="natural"
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all duration-200 gap-2 h-9"
              >
                <Wand2 className="w-4 h-4" />
                AI Search
              </TabsTrigger>
              <TabsTrigger
                value="structured"
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all duration-200 gap-2 h-9"
              >
                <Search className="w-4 h-4" />
                Manual Search
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Natural Language Search */}
          <TabsContent value="natural" className="m-0">
            <CardContent className="p-6 md:p-8">
              <form onSubmit={handleNaturalSubmit} className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/10">
                      <Sparkles className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <Label htmlFor="natural-query" className="text-base font-semibold">
                        Describe your trip
                      </Label>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Our AI understands natural language in English or Spanish
                      </p>
                    </div>
                  </div>

                  <div className="relative">
                    <Textarea
                      id="natural-query"
                      value={naturalQuery}
                      onChange={(e) => setNaturalQuery(e.target.value)}
                      placeholder="I want to go to Japan in February for about 3 weeks, budget under $1500 from Buenos Aires. I'm flexible with exact dates..."
                      className="min-h-[140px] resize-none text-base leading-relaxed border-border/60 focus:border-primary/50 transition-all pr-4 input-premium rounded-xl"
                      disabled={isLoading}
                    />
                    {/* Character indicator */}
                    <div className="absolute bottom-3 right-3 text-[10px] text-muted-foreground/50">
                      {naturalQuery.length > 0 && `${naturalQuery.length} chars`}
                    </div>
                  </div>

                  {/* Example queries */}
                  <div className="flex flex-wrap gap-2">
                    <span className="text-xs text-muted-foreground">Try:</span>
                    {[
                      "Weekend in Miami from NYC",
                      "Cheap flights to Europe in summer",
                      "Business class to Tokyo",
                    ].map((example) => (
                      <button
                        key={example}
                        type="button"
                        onClick={() => setNaturalQuery(example)}
                        className="text-xs px-2.5 py-1 rounded-full bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                        disabled={isLoading}
                      >
                        {example}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-4 pt-2">
                  <Button
                    type="submit"
                    size="lg"
                    disabled={!naturalQuery.trim() || isLoading || !onNaturalSearch}
                    className="font-semibold btn-press btn-premium shadow-lg hover:shadow-xl transition-all px-8 h-12"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Searching...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-5 h-5 mr-2" />
                        Find Flights
                      </>
                    )}
                  </Button>
                  {!onNaturalSearch && (
                    <p className="text-sm text-muted-foreground italic">
                      AI search coming soon
                    </p>
                  )}
                </div>
              </form>
            </CardContent>
          </TabsContent>

          {/* Structured Search */}
          <TabsContent value="structured" className="m-0">
            <CardContent className="p-6 md:p-8">
              <form
                onSubmit={form.handleSubmit(handleStructuredSubmit)}
                className="space-y-6"
              >
                {/* Trip type selector */}
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-2 p-1 rounded-xl bg-muted/40">
                    <Button
                      type="button"
                      variant={tripType === "roundtrip" ? "default" : "ghost"}
                      size="sm"
                      onClick={() => {
                        setTripType("roundtrip");
                        setCompareRoutes(false);
                      }}
                      className="gap-2"
                    >
                      <ArrowRightLeft className="w-4 h-4" />
                      Round Trip
                    </Button>
                    <Button
                      type="button"
                      variant={tripType === "oneway" ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setTripType("oneway")}
                      className="gap-2"
                    >
                      <Plane className="w-4 h-4" />
                      One Way
                    </Button>
                  </div>

                  {/* Compare Routes toggle */}
                  {tripType === "oneway" && onCompareRoutes && (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-accent/10 border border-accent/20">
                      <Switch
                        id="compare-routes"
                        checked={compareRoutes}
                        onCheckedChange={setCompareRoutes}
                        disabled={isLoading}
                      />
                      <Label
                        htmlFor="compare-routes"
                        className="text-sm font-medium flex items-center gap-1.5 cursor-pointer text-accent"
                      >
                        <Route className="w-4 h-4" />
                        Compare Routes
                      </Label>
                    </div>
                  )}
                </div>

                {/* Origin & Destination */}
                <div className="grid md:grid-cols-2 gap-5">
                  <AirportSearch
                    id="origin"
                    label="From"
                    value={form.watch("origin")}
                    onChange={(code) => form.setValue("origin", code, { shouldValidate: true })}
                    placeholder="City or airport..."
                    disabled={isLoading}
                    iconRotation="-45deg"
                    error={form.formState.errors.origin?.message}
                  />

                  <AirportSearch
                    id="destination"
                    label="To"
                    value={form.watch("destination")}
                    onChange={(code) => form.setValue("destination", code, { shouldValidate: true })}
                    placeholder="City or airport..."
                    disabled={isLoading}
                    iconRotation="45deg"
                    error={form.formState.errors.destination?.message}
                  />
                </div>

                {/* Dates */}
                <div className="grid md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <Label htmlFor="departureDate" className="flex items-center gap-2">
                      <CalendarDays className="w-4 h-4 text-muted-foreground" />
                      Departure
                    </Label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                      <Input
                        id="departureDate"
                        type="date"
                        {...form.register("departureDate")}
                        min={minDate}
                        className="pl-10 input-premium"
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
                      <Label htmlFor="returnDate" className="flex items-center gap-2">
                        <CalendarDays className="w-4 h-4 text-muted-foreground" />
                        Return
                      </Label>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                        <Input
                          id="returnDate"
                          type="date"
                          {...form.register("returnDate")}
                          min={form.watch("departureDate") || minDate}
                          className="pl-10 input-premium"
                          disabled={isLoading}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Flexible dates toggle */}
                <div className="flex items-center gap-4 p-4 rounded-xl bg-gradient-to-r from-muted/40 to-muted/20 border border-border/50">
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
                      className="font-semibold cursor-pointer flex items-center gap-2"
                    >
                      <CalendarDays className="w-4 h-4 text-primary" />
                      Flexible dates (±3 days)
                    </Label>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Search nearby dates to find better prices
                    </p>
                  </div>
                </div>

                {/* Passengers & Class */}
                <div className="grid md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <Label htmlFor="adults" className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-muted-foreground" />
                      Passengers
                    </Label>
                    <Select
                      value={form.watch("adults").toString()}
                      onValueChange={(v) =>
                        form.setValue("adults", parseInt(v))
                      }
                      disabled={isLoading}
                    >
                      <SelectTrigger className="input-premium">
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

                  <div className="space-y-2">
                    <Label htmlFor="travelClass" className="flex items-center gap-2">
                      <Plane className="w-4 h-4 text-muted-foreground" />
                      Class
                    </Label>
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
                      <SelectTrigger className="input-premium">
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
                  className="w-full md:w-auto font-semibold btn-press btn-premium shadow-lg hover:shadow-xl transition-all px-10 h-12"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Searching...
                    </>
                  ) : (
                    <>
                      <Search className="w-5 h-5 mr-2" />
                      Search Flights
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
}
