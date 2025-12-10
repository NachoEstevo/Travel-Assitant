/**
 * Stopover Hub Configuration
 *
 * Common hub airports that often offer cheaper connections between regions.
 * Used for multi-city route optimization.
 */

export interface StopoverHub {
  code: string;
  name: string;
  city: string;
  country: string;
  region: "europe" | "middle_east" | "asia" | "americas" | "oceania";
  // Airlines that use this as a major hub
  airlines: string[];
  // Good for connections between these regions
  connectsRegions: string[];
}

export const STOPOVER_HUBS: StopoverHub[] = [
  // European Hubs
  {
    code: "IST",
    name: "Istanbul Airport",
    city: "Istanbul",
    country: "Turkey",
    region: "europe",
    airlines: ["TK"], // Turkish Airlines
    connectsRegions: ["europe", "middle_east", "asia", "americas"],
  },
  {
    code: "LHR",
    name: "London Heathrow",
    city: "London",
    country: "UK",
    region: "europe",
    airlines: ["BA", "VS"], // British Airways, Virgin Atlantic
    connectsRegions: ["europe", "americas", "asia", "oceania"],
  },
  {
    code: "FRA",
    name: "Frankfurt Airport",
    city: "Frankfurt",
    country: "Germany",
    region: "europe",
    airlines: ["LH"], // Lufthansa
    connectsRegions: ["europe", "americas", "asia"],
  },
  {
    code: "AMS",
    name: "Amsterdam Schiphol",
    city: "Amsterdam",
    country: "Netherlands",
    region: "europe",
    airlines: ["KL"], // KLM
    connectsRegions: ["europe", "americas", "asia"],
  },
  {
    code: "CDG",
    name: "Paris Charles de Gaulle",
    city: "Paris",
    country: "France",
    region: "europe",
    airlines: ["AF"], // Air France
    connectsRegions: ["europe", "americas", "asia", "africa"],
  },
  {
    code: "MAD",
    name: "Madrid Barajas",
    city: "Madrid",
    country: "Spain",
    region: "europe",
    airlines: ["IB"], // Iberia
    connectsRegions: ["europe", "americas"],
  },
  {
    code: "HEL",
    name: "Helsinki Airport",
    city: "Helsinki",
    country: "Finland",
    region: "europe",
    airlines: ["AY"], // Finnair
    connectsRegions: ["europe", "asia"],
  },
  {
    code: "ZRH",
    name: "Zurich Airport",
    city: "Zurich",
    country: "Switzerland",
    region: "europe",
    airlines: ["LX"], // Swiss
    connectsRegions: ["europe", "americas", "asia"],
  },

  // Middle East Hubs
  {
    code: "DXB",
    name: "Dubai International",
    city: "Dubai",
    country: "UAE",
    region: "middle_east",
    airlines: ["EK"], // Emirates
    connectsRegions: ["europe", "asia", "oceania", "africa", "americas"],
  },
  {
    code: "DOH",
    name: "Hamad International",
    city: "Doha",
    country: "Qatar",
    region: "middle_east",
    airlines: ["QR"], // Qatar Airways
    connectsRegions: ["europe", "asia", "oceania", "africa", "americas"],
  },
  {
    code: "AUH",
    name: "Abu Dhabi International",
    city: "Abu Dhabi",
    country: "UAE",
    region: "middle_east",
    airlines: ["EY"], // Etihad
    connectsRegions: ["europe", "asia", "oceania", "americas"],
  },

  // Asian Hubs
  {
    code: "SIN",
    name: "Singapore Changi",
    city: "Singapore",
    country: "Singapore",
    region: "asia",
    airlines: ["SQ"], // Singapore Airlines
    connectsRegions: ["asia", "oceania", "europe", "americas"],
  },
  {
    code: "HKG",
    name: "Hong Kong International",
    city: "Hong Kong",
    country: "China",
    region: "asia",
    airlines: ["CX"], // Cathay Pacific
    connectsRegions: ["asia", "oceania", "europe", "americas"],
  },
  {
    code: "ICN",
    name: "Incheon International",
    city: "Seoul",
    country: "South Korea",
    region: "asia",
    airlines: ["KE", "OZ"], // Korean Air, Asiana
    connectsRegions: ["asia", "americas", "europe"],
  },
  {
    code: "NRT",
    name: "Narita International",
    city: "Tokyo",
    country: "Japan",
    region: "asia",
    airlines: ["NH", "JL"], // ANA, JAL
    connectsRegions: ["asia", "americas", "europe"],
  },
  {
    code: "BKK",
    name: "Suvarnabhumi Airport",
    city: "Bangkok",
    country: "Thailand",
    region: "asia",
    airlines: ["TG"], // Thai Airways
    connectsRegions: ["asia", "oceania", "europe"],
  },
  {
    code: "KUL",
    name: "Kuala Lumpur International",
    city: "Kuala Lumpur",
    country: "Malaysia",
    region: "asia",
    airlines: ["MH"], // Malaysia Airlines
    connectsRegions: ["asia", "oceania", "europe"],
  },

  // Americas Hubs
  {
    code: "JFK",
    name: "John F. Kennedy International",
    city: "New York",
    country: "USA",
    region: "americas",
    airlines: ["AA", "DL", "UA"],
    connectsRegions: ["americas", "europe", "asia"],
  },
  {
    code: "MIA",
    name: "Miami International",
    city: "Miami",
    country: "USA",
    region: "americas",
    airlines: ["AA"],
    connectsRegions: ["americas", "europe"],
  },
  {
    code: "LAX",
    name: "Los Angeles International",
    city: "Los Angeles",
    country: "USA",
    region: "americas",
    airlines: ["AA", "DL", "UA"],
    connectsRegions: ["americas", "asia", "oceania"],
  },
  {
    code: "YYZ",
    name: "Toronto Pearson",
    city: "Toronto",
    country: "Canada",
    region: "americas",
    airlines: ["AC"], // Air Canada
    connectsRegions: ["americas", "europe", "asia"],
  },
  {
    code: "PTY",
    name: "Tocumen International",
    city: "Panama City",
    country: "Panama",
    region: "americas",
    airlines: ["CM"], // Copa Airlines
    connectsRegions: ["americas"],
  },
  {
    code: "GRU",
    name: "São Paulo Guarulhos",
    city: "São Paulo",
    country: "Brazil",
    region: "americas",
    airlines: ["LA"], // LATAM
    connectsRegions: ["americas", "europe"],
  },
  {
    code: "MEX",
    name: "Mexico City International",
    city: "Mexico City",
    country: "Mexico",
    region: "americas",
    airlines: ["AM"], // Aeromexico
    connectsRegions: ["americas", "europe"],
  },
];

/**
 * Get region for an airport code (simplified mapping)
 */
export function getRegionForAirport(code: string): string {
  // Check if it's a known hub
  const hub = STOPOVER_HUBS.find((h) => h.code === code);
  if (hub) return hub.region;

  // Simple region detection based on common patterns
  // This is a simplified approach - in production, use a proper airport database
  const regionPatterns: Record<string, string[]> = {
    europe: [
      "LHR", "LGW", "STN", "CDG", "ORY", "FRA", "MUC", "AMS", "MAD", "BCN",
      "FCO", "MXP", "ZRH", "VIE", "BRU", "CPH", "OSL", "ARN", "HEL", "DUB",
      "LIS", "ATH", "PRG", "WAW", "BUD",
    ],
    middle_east: [
      "DXB", "DOH", "AUH", "TLV", "AMM", "CAI", "RUH", "JED", "KWI", "BAH",
    ],
    asia: [
      "SIN", "HKG", "NRT", "HND", "ICN", "PVG", "SHA", "PEK", "BKK", "KUL",
      "DEL", "BOM", "MNL", "TPE", "CGK", "SGN", "HAN",
    ],
    americas: [
      "JFK", "LAX", "ORD", "MIA", "SFO", "ATL", "DFW", "DEN", "SEA", "BOS",
      "YYZ", "YVR", "YUL", "MEX", "GRU", "EZE", "SCL", "BOG", "LIM", "PTY",
    ],
    oceania: [
      "SYD", "MEL", "BNE", "PER", "AKL", "WLG", "CHC",
    ],
    africa: [
      "JNB", "CPT", "NBO", "ADD", "CMN", "ALG", "CAI", "LOS", "ACC",
    ],
  };

  for (const [region, codes] of Object.entries(regionPatterns)) {
    if (codes.includes(code)) return region;
  }

  // Default to unknown
  return "unknown";
}

/**
 * Find suitable stopover hubs between origin and destination
 */
export function findSuitableHubs(
  originCode: string,
  destinationCode: string,
  maxHubs: number = 5
): StopoverHub[] {
  const originRegion = getRegionForAirport(originCode);
  const destRegion = getRegionForAirport(destinationCode);

  // Don't suggest stopovers for same-region flights
  if (originRegion === destRegion) {
    return [];
  }

  // Find hubs that connect both regions
  const suitableHubs = STOPOVER_HUBS.filter((hub) => {
    // Don't suggest origin or destination as stopover
    if (hub.code === originCode || hub.code === destinationCode) {
      return false;
    }

    // Hub should connect both regions
    const connectsBoth =
      (hub.connectsRegions.includes(originRegion) || hub.region === originRegion) &&
      (hub.connectsRegions.includes(destRegion) || hub.region === destRegion);

    return connectsBoth;
  });

  // Sort by relevance (prefer hubs in middle regions for long-haul)
  const sorted = suitableHubs.sort((a, b) => {
    // Prefer Middle East hubs for Europe-Asia routes
    if (
      (originRegion === "europe" && destRegion === "asia") ||
      (originRegion === "asia" && destRegion === "europe")
    ) {
      if (a.region === "middle_east" && b.region !== "middle_east") return -1;
      if (b.region === "middle_east" && a.region !== "middle_east") return 1;
    }

    // Prefer hubs with more connections
    return b.connectsRegions.length - a.connectsRegions.length;
  });

  return sorted.slice(0, maxHubs);
}

/**
 * Calculate minimum layover time based on hub
 */
export function getMinimumLayover(hubCode: string): number {
  // Minimum hours for a comfortable connection
  const hubLayovers: Record<string, number> = {
    // Large/complex airports need more time
    LHR: 3,
    JFK: 3,
    LAX: 3,
    CDG: 2.5,
    FRA: 2,
    // Efficient transit hubs
    DXB: 2,
    DOH: 1.5,
    SIN: 1.5,
    AMS: 2,
    ICN: 2,
  };

  return hubLayovers[hubCode] || 2; // Default 2 hours
}
