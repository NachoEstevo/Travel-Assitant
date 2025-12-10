declare module "amadeus" {
  interface AmadeusConfig {
    clientId: string;
    clientSecret: string;
    hostname?: "test" | "production";
  }

  interface AmadeusResponse<T> {
    data: T;
    result: {
      statusCode: number;
    };
  }

  interface FlightOffersSearchParams {
    originLocationCode: string;
    destinationLocationCode: string;
    departureDate: string;
    returnDate?: string;
    adults: number;
    children?: number;
    infants?: number;
    travelClass?: "ECONOMY" | "PREMIUM_ECONOMY" | "BUSINESS" | "FIRST";
    nonStop?: boolean;
    currencyCode?: string;
    maxPrice?: number;
    max?: number;
  }

  interface LocationSearchParams {
    keyword: string;
    subType?: string;
    sort?: string;
    view?: string;
  }

  class Amadeus {
    constructor(config: AmadeusConfig);

    shopping: {
      flightOffersSearch: {
        get(params: FlightOffersSearchParams): Promise<AmadeusResponse<unknown>>;
        post(body: unknown): Promise<AmadeusResponse<unknown>>;
      };
    };

    referenceData: {
      locations: {
        get(params: LocationSearchParams): Promise<AmadeusResponse<unknown>>;
      };
    };
  }

  export = Amadeus;
}
