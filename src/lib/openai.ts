import OpenAI from "openai";
import { z } from "zod";

// Lazy-loaded OpenAI client singleton
let openaiClient: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    if (!process.env.OPENAI_API_KEY) {
      throw new OpenAIServiceError("OPENAI_API_KEY environment variable is not set");
    }
    openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return openaiClient;
}

// ============================================
// Configuration
// ============================================

// Model configuration - defaults to gpt-4o-mini, can be overridden via env
// gpt-4o-mini is optimized for speed and cost while maintaining good quality
const DEFAULT_MODEL = "gpt-4o-mini";
const getModel = () => process.env.OPENAI_MODEL || DEFAULT_MODEL;

// ============================================
// Travel Query Schema
// ============================================

// Helper to make fields nullable-friendly (LLMs often return null instead of undefined)
const nullableString = () => z.string().optional().nullable().transform(v => v ?? undefined);
const nullableNumber = () => z.number().optional().nullable().transform(v => v ?? undefined);
const nullableArray = <T extends z.ZodTypeAny>(schema: T) =>
  z.array(schema).optional().nullable().transform(v => v ?? undefined);

export const TravelQuerySchema = z.object({
  origin: z.object({
    city: z.string().describe("City name"),
    iataCode: z.string().length(3).optional().nullable().transform(v => v ?? undefined).describe("IATA airport code if known"),
    country: nullableString().describe("Country name"),
  }).describe("Departure location"),

  destination: z.object({
    city: z.string().describe("City name"),
    iataCode: z.string().length(3).optional().nullable().transform(v => v ?? undefined).describe("IATA airport code if known"),
    country: nullableString().describe("Country name"),
  }).describe("Arrival location"),

  dates: z.object({
    departure: z.object({
      date: nullableString().describe("Specific date in YYYY-MM-DD format"),
      month: nullableString().describe("Month name if flexible (e.g., 'February')"),
      flexibility: z.enum(["exact", "flexible_few_days", "flexible_week", "anytime_month"]).default("exact"),
    }).describe("Departure date information"),
    return: z.object({
      date: nullableString().describe("Specific return date in YYYY-MM-DD format"),
      durationDays: nullableNumber().describe("Trip duration in days if specified"),
      durationWeeks: nullableNumber().describe("Trip duration in weeks if specified"),
      flexibility: z.enum(["exact", "flexible_few_days", "flexible_week", "one_way"]).default("exact"),
    }).optional().nullable().transform(v => v ?? undefined).describe("Return date information, null for one-way trips"),
  }).describe("Travel dates"),

  passengers: z.object({
    adults: z.number().min(1).max(9).default(1),
    children: z.number().min(0).max(9).default(0),
    infants: z.number().min(0).max(9).default(0),
  }).describe("Number of passengers"),

  preferences: z.object({
    maxBudget: nullableNumber().describe("Maximum total budget in USD"),
    budgetCurrency: z.string().default("USD").describe("Budget currency"),
    cabinClass: z.enum(["ECONOMY", "PREMIUM_ECONOMY", "BUSINESS", "FIRST"]).default("ECONOMY"),
    directFlightsOnly: z.boolean().default(false),
    flexibleDates: z.boolean().default(false).describe("User indicated flexibility with dates"),
    preferredAirlines: nullableArray(z.string()).describe("Preferred airline codes"),
    avoidAirlines: nullableArray(z.string()).describe("Airlines to avoid"),
  }).describe("Travel preferences and constraints"),

  intent: z.object({
    tripType: z.enum(["one_way", "round_trip", "multi_city"]).default("round_trip"),
    purpose: nullableString().describe("Trip purpose if mentioned (vacation, business, etc.)"),
    additionalNotes: nullableString().describe("Any other relevant information from the query"),
  }).describe("Trip intent and additional context"),

  confidence: z.object({
    overall: z.number().min(0).max(1).describe("Overall confidence in parsing (0-1)"),
    needsClarification: z.boolean().default(false),
    clarificationQuestions: nullableArray(z.string()).describe("Questions to ask user for clarity"),
  }).describe("Parsing confidence and potential clarifications"),
});

export type ParsedTravelQuery = z.infer<typeof TravelQuerySchema>;

// ============================================
// Airport Code Lookup Schema
// ============================================

export const AirportLookupSchema = z.object({
  airports: z.array(z.object({
    city: z.string(),
    iataCode: z.string().length(3),
    airportName: z.string(),
    country: z.string(),
  })),
});

export type AirportLookup = z.infer<typeof AirportLookupSchema>;

// ============================================
// API Functions
// ============================================

// Comprehensive system prompt for travel query parsing
const buildSystemPrompt = (currentDate: string) => `You are an expert travel assistant specializing in parsing natural language flight queries. Your task is to extract structured search parameters from conversational input.

## Current Context
- Today's date: ${currentDate}
- Default origin: Buenos Aires, Argentina (user's home base)
- Default currency: USD

## Core Parsing Rules

### 1. LOCATIONS
**Origin:**
- If no origin is specified, default to Buenos Aires (EZE)
- Handle Spanish city names: "de Buenos Aires", "desde BA", "saliendo de Ezeiza"
- For Argentina departures, prefer EZE over AEP for international flights

**Destination:**
- Extract the primary destination clearly
- Handle country-level destinations by picking the main hub:
  - "Japan" → Tokyo (NRT or HND)
  - "Spain" → Madrid (MAD)
  - "USA" / "United States" → context-dependent (NYC if east coast mentioned, LAX if west)
  - "Europe" → ask for clarification unless specific city mentioned

**Metro Area Airports (use main international hub):**
- Tokyo: NRT (Narita) for international, HND (Haneda) for domestic/some international
- New York: JFK (primary international), EWR (United hub), LGA (domestic)
- London: LHR (primary), LGW (secondary), STN (budget carriers)
- Paris: CDG (primary), ORY (some European)
- Buenos Aires: EZE (international), AEP (domestic/regional)
- Los Angeles: LAX
- São Paulo: GRU (international), CGH (domestic)
- Miami: MIA
- Madrid: MAD
- Barcelona: BCN
- Rome: FCO
- Milan: MXP (international), LIN (domestic)
- Sydney: SYD
- Dubai: DXB
- Singapore: SIN
- Hong Kong: HKG
- Seoul: ICN

### 2. DATES
**Date Expression Patterns:**
- "late February" → February 20-28 (set date to Feb 20, flexibility: flexible_few_days)
- "early March" → March 1-10 (set date to Mar 5)
- "mid April" → April 10-20 (set date to Apr 15)
- "around the 15th" → exact date with flexible_few_days
- "next weekend" → upcoming Saturday (calculate from current date)
- "this month" → anytime_month flexibility
- "in 2 weeks" → calculate exact date from today
- "February or March" → set month to earliest, note flexibility in additionalNotes
- "for about 2 weeks" → durationDays: 14
- "3 weeks" → durationWeeks: 3
- "10-15 days" → durationDays: 12 (midpoint)

**Spanish Date Expressions:**
- "fines de febrero" → late February
- "principios de marzo" → early March
- "mediados de abril" → mid April
- "semana que viene" → next week
- "el mes que viene" → next month

**Return Date Logic:**
- If duration specified: calculate from departure
- If "one way" / "solo ida" / "sin vuelta": tripType = one_way
- If no return info: assume round_trip, default 7-10 days

### 3. PASSENGERS
- "solo" / "sola" / "alone" / "just me" → 1 adult
- "we" / "nosotros" / "us" / "my partner and I" → 2 adults unless specified
- "family" without details → ask for clarification OR default to 2 adults
- "with kids" / "con niños" → ask ages or default to 2 adults + 2 children
- Explicit counts override defaults

### 4. PREFERENCES
**Budget:**
- "cheap" / "barato" / "budget" → set maxBudget around $800-1000 for long-haul
- "under $X" / "menos de X" → maxBudget = X
- Convert currencies: "1500 euros" → approximately in USD
- "no budget limit" / "price doesn't matter" → leave maxBudget empty

**Cabin Class:**
- Default: ECONOMY
- "business" / "ejecutiva" → BUSINESS
- "first" / "primera" → FIRST
- "premium" / "premium economy" → PREMIUM_ECONOMY

**Flight Preferences:**
- "direct" / "directo" / "non-stop" / "sin escalas" → directFlightsOnly: true
- "avoiding X airline" → avoidAirlines
- "preferably with X" → preferredAirlines

### 5. TRIP TYPE
- Default: round_trip
- "one way" / "solo ida" → one_way
- Multiple destinations mentioned → multi_city
- "open jaw" / mentioning different return city → multi_city

### 6. CONFIDENCE SCORING
Rate your overall confidence 0-1:
- 1.0: All key info explicit and unambiguous
- 0.8-0.9: Minor assumptions made but reasonable
- 0.6-0.7: Some ambiguity, may want to confirm
- 0.4-0.5: Significant gaps, need clarification
- Below 0.4: Too vague to search

Set needsClarification: true when:
- Destination is a country/region without city
- Date range spans more than 2 months
- Passenger count unclear with "family" or "group"
- Budget mentioned as "cheap" without route context

## Output Format
Return valid JSON matching this exact structure:
{
  "origin": { "city": "string", "iataCode": "XXX", "country": "string" },
  "destination": { "city": "string", "iataCode": "XXX", "country": "string" },
  "dates": {
    "departure": {
      "date": "YYYY-MM-DD or null",
      "month": "month name or null",
      "flexibility": "exact|flexible_few_days|flexible_week|anytime_month"
    },
    "return": {
      "date": "YYYY-MM-DD or null",
      "durationDays": "number or null",
      "durationWeeks": "number or null",
      "flexibility": "exact|flexible_few_days|flexible_week|one_way"
    }
  },
  "passengers": { "adults": 1, "children": 0, "infants": 0 },
  "preferences": {
    "maxBudget": "number or null",
    "budgetCurrency": "USD",
    "cabinClass": "ECONOMY|PREMIUM_ECONOMY|BUSINESS|FIRST",
    "directFlightsOnly": false,
    "flexibleDates": true/false,
    "preferredAirlines": [],
    "avoidAirlines": []
  },
  "intent": {
    "tripType": "one_way|round_trip|multi_city",
    "purpose": "string or null",
    "additionalNotes": "any relevant context"
  },
  "confidence": {
    "overall": 0.0-1.0,
    "needsClarification": true/false,
    "clarificationQuestions": ["array of questions if needed"]
  }
}

Always populate every field. Use null for missing optional values. Be precise with IATA codes.`;

/**
 * Parse a natural language travel query into structured search parameters
 */
export async function parseTravelQuery(query: string): Promise<ParsedTravelQuery> {
  const client = getOpenAIClient();
  const model = getModel();

  const currentDate = new Date().toISOString().split("T")[0];
  const systemPrompt = buildSystemPrompt(currentDate);

  try {
    const completion = await client.chat.completions.create({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: query },
      ],
      response_format: { type: "json_object" },
      temperature: 0.1, // Low temperature for more consistent parsing
    });

    const content = completion.choices[0].message.content;

    if (!content) {
      throw new OpenAIServiceError("Failed to parse travel query - no response returned");
    }

    const parsed = JSON.parse(content);

    // Validate with Zod
    const validated = TravelQuerySchema.parse(parsed);

    return validated;
  } catch (error) {
    console.error("OpenAI parse travel query error:", error);
    if (error instanceof OpenAIServiceError) throw error;
    if (error instanceof z.ZodError) {
      throw new OpenAIServiceError("Failed to validate parsed travel query", error);
    }
    throw new OpenAIServiceError("Failed to parse travel query", error);
  }
}

/**
 * Look up IATA airport codes for cities using AI
 */
export async function lookupAirportCodes(cities: string[]): Promise<AirportLookup> {
  const client = getOpenAIClient();
  const model = getModel();

  const systemPrompt = `You are an expert airport code lookup assistant. Given city names, return the most appropriate IATA airport codes.

## Rules:
1. For cities with multiple airports, choose the PRIMARY INTERNATIONAL airport:
   - Tokyo → NRT (Narita) for most international
   - New York → JFK (John F. Kennedy)
   - London → LHR (Heathrow)
   - Paris → CDG (Charles de Gaulle)
   - Buenos Aires → EZE (Ezeiza) for international
   - São Paulo → GRU (Guarulhos)
   - Milan → MXP (Malpensa)

2. Handle common name variations:
   - "BA" or "Buenos Aires" → EZE
   - "NYC" or "New York" → JFK
   - "LA" or "Los Angeles" → LAX
   - "Rio" or "Rio de Janeiro" → GIG
   - "SP" or "São Paulo" → GRU

3. For country names without city, use the main hub:
   - Japan → NRT (Tokyo Narita)
   - Argentina → EZE (Buenos Aires)
   - Australia → SYD (Sydney)
   - UK/England → LHR (London Heathrow)

4. Always return valid 3-letter IATA codes (uppercase).

## Response Format:
Return valid JSON exactly like this:
{
  "airports": [
    { "city": "City Name", "iataCode": "XXX", "airportName": "Full Airport Name", "country": "Country Name" }
  ]
}`;

  try {
    const completion = await client.chat.completions.create({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Look up airport codes for: ${cities.join(", ")}` },
      ],
      response_format: { type: "json_object" },
      temperature: 0,
    });

    const content = completion.choices[0].message.content;

    if (!content) {
      throw new OpenAIServiceError("Failed to lookup airport codes - no response");
    }

    const parsed = JSON.parse(content);
    const validated = AirportLookupSchema.parse(parsed);

    return validated;
  } catch (error) {
    console.error("OpenAI airport lookup error:", error);
    if (error instanceof OpenAIServiceError) throw error;
    if (error instanceof z.ZodError) {
      throw new OpenAIServiceError("Failed to validate airport lookup", error);
    }
    throw new OpenAIServiceError("Failed to lookup airport codes", error);
  }
}

/**
 * Generate follow-up questions or suggestions based on search results
 */
export async function generateSearchInsights(
  query: string,
  resultsCount: number,
  priceRange: { min: number; max: number },
  hasDirectFlights: boolean
): Promise<string> {
  const client = getOpenAIClient();
  const model = getModel();

  try {
    const completion = await client.chat.completions.create({
      model,
      messages: [
        {
          role: "system",
          content: `You are a helpful travel assistant. Provide brief, actionable insights about flight search results. Keep responses concise (2-3 sentences max).`,
        },
        {
          role: "user",
          content: `Original search: "${query}"
Results: ${resultsCount} flights found
Price range: $${priceRange.min} - $${priceRange.max}
Direct flights available: ${hasDirectFlights ? "Yes" : "No"}

Provide a brief insight or suggestion for the user.`,
        },
      ],
      temperature: 0.7,
      max_tokens: 150,
    });

    return completion.choices[0].message.content || "";
  } catch (error) {
    console.error("OpenAI generate insights error:", error);
    return ""; // Non-critical, return empty on error
  }
}

// ============================================
// Utility Functions
// ============================================

/**
 * Convert parsed dates to YYYY-MM-DD format for Amadeus
 * Handles various flexibility modes and relative date expressions
 */
export function resolveParsedDates(parsed: ParsedTravelQuery): {
  departureDate: string;
  returnDate?: string;
  departureDateRange?: { start: string; end: string };
} {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Helper to format date as YYYY-MM-DD
  const formatDate = (date: Date): string => {
    return date.toISOString().split("T")[0];
  };

  // Helper to get date from month name with flexibility handling
  const getDateFromMonth = (monthName: string, flexibility: string): { date: Date; range?: { start: Date; end: Date } } => {
    const months: Record<string, number> = {
      january: 0, february: 1, march: 2, april: 3,
      may: 4, june: 5, july: 6, august: 7,
      september: 8, october: 9, november: 10, december: 11,
    };

    const monthIndex = months[monthName.toLowerCase()];
    if (monthIndex === undefined) {
      // If month not recognized, default to 1 month from now
      const future = new Date(today);
      future.setMonth(future.getMonth() + 1);
      return { date: future };
    }

    // Determine year - if month has passed, use next year
    const targetYear = monthIndex < today.getMonth() ? today.getFullYear() + 1 : today.getFullYear();

    // Get the last day of the month
    const lastDayOfMonth = new Date(targetYear, monthIndex + 1, 0).getDate();

    // Position the date based on flexibility
    let day: number;
    let rangeStart: Date;
    let rangeEnd: Date;

    switch (flexibility) {
      case "anytime_month":
        // Middle of month, full month range
        day = 15;
        rangeStart = new Date(targetYear, monthIndex, 1);
        rangeEnd = new Date(targetYear, monthIndex, lastDayOfMonth);
        break;
      case "flexible_week":
        // Early-mid month with 1-week range
        day = 10;
        rangeStart = new Date(targetYear, monthIndex, 7);
        rangeEnd = new Date(targetYear, monthIndex, 21);
        break;
      case "flexible_few_days":
        // Mid month with few days range
        day = 15;
        rangeStart = new Date(targetYear, monthIndex, 12);
        rangeEnd = new Date(targetYear, monthIndex, 18);
        break;
      default:
        day = 15;
        rangeStart = new Date(targetYear, monthIndex, day);
        rangeEnd = rangeStart;
    }

    const date = new Date(targetYear, monthIndex, day);

    return {
      date,
      range: { start: rangeStart, end: rangeEnd }
    };
  };

  // Ensure date is not in the past - if it is, push to next year
  const ensureFuture = (date: Date): Date => {
    if (date <= today) {
      // Date is in the past - try adding a year
      const nextYear = new Date(date);
      nextYear.setFullYear(nextYear.getFullYear() + 1);
      return nextYear;
    }
    return date;
  };

  let departureDate: string;
  let departureDateRange: { start: string; end: string } | undefined;

  // Helper to parse YYYY-MM-DD string without timezone issues
  const parseDateString = (dateStr: string): Date => {
    const [year, month, day] = dateStr.split("-").map(Number);
    return new Date(year, month - 1, day);
  };

  // Resolve departure date
  if (parsed.dates.departure.date) {
    // Exact date provided - use the AI-parsed date directly
    const depDate = parseDateString(parsed.dates.departure.date);
    departureDate = formatDate(ensureFuture(depDate));

    // Add range if flexible
    if (parsed.dates.departure.flexibility === "flexible_few_days") {
      const start = new Date(depDate);
      start.setDate(start.getDate() - 2);
      const end = new Date(depDate);
      end.setDate(end.getDate() + 2);
      departureDateRange = {
        start: formatDate(ensureFuture(start)),
        end: formatDate(end),
      };
    }
  } else if (parsed.dates.departure.month) {
    // Month-based flexibility
    const result = getDateFromMonth(
      parsed.dates.departure.month,
      parsed.dates.departure.flexibility
    );
    departureDate = formatDate(ensureFuture(result.date));
    if (result.range) {
      departureDateRange = {
        start: formatDate(ensureFuture(result.range.start)),
        end: formatDate(result.range.end),
      };
    }
  } else {
    // Default to 2 weeks from now
    const future = new Date(today);
    future.setDate(future.getDate() + 14);
    departureDate = formatDate(future);
  }

  // Resolve return date
  let returnDate: string | undefined;

  if (parsed.intent.tripType === "one_way") {
    returnDate = undefined;
  } else if (parsed.dates.return?.date) {
    // Use AI-parsed return date directly
    const retDate = parseDateString(parsed.dates.return.date);
    returnDate = formatDate(retDate);
  } else if (parsed.dates.return?.durationDays) {
    const depDate = new Date(departureDate);
    depDate.setDate(depDate.getDate() + parsed.dates.return.durationDays);
    returnDate = formatDate(depDate);
  } else if (parsed.dates.return?.durationWeeks) {
    const depDate = new Date(departureDate);
    depDate.setDate(depDate.getDate() + parsed.dates.return.durationWeeks * 7);
    returnDate = formatDate(depDate);
  } else if (parsed.intent.tripType === "round_trip") {
    // Default to 7 days for round trip if no duration specified
    const depDate = new Date(departureDate);
    depDate.setDate(depDate.getDate() + 7);
    returnDate = formatDate(depDate);
  }

  // Validate return is after departure
  if (returnDate && returnDate <= departureDate) {
    const depDate = new Date(departureDate);
    depDate.setDate(depDate.getDate() + 7);
    returnDate = formatDate(depDate);
  }

  return { departureDate, returnDate, departureDateRange };
}

// ============================================
// Error Handling
// ============================================

export class OpenAIServiceError extends Error {
  public originalError: unknown;

  constructor(message: string, originalError?: unknown) {
    super(message);
    this.name = "OpenAIServiceError";
    this.originalError = originalError;
  }
}

/**
 * Check if OpenAI is configured
 */
export function isOpenAIConfigured(): boolean {
  return !!process.env.OPENAI_API_KEY;
}
