import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAuthenticated } from "@/lib/auth";

export interface HistoryItem {
  id: string;
  rawPrompt: string;
  origin: string;
  destination: string;
  departureDate: string | null;
  returnDate: string | null;
  resultCount: number;
  cheapestPrice: number | null;
  currency: string;
  createdAt: string;
  hasTask: boolean;
}

export interface HistoryResponse {
  success: true;
  data: {
    searches: HistoryItem[];
    total: number;
  };
}

export interface HistoryErrorResponse {
  success: false;
  error: string;
}

// GET - List search history
export async function GET(request: NextRequest) {
  try {
    const authenticated = await isAuthenticated();
    if (!authenticated) {
      return NextResponse.json<HistoryErrorResponse>(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);
    const offset = parseInt(searchParams.get("offset") || "0");

    // Fetch searches with aggregated result info
    const searches = await prisma.searchQuery.findMany({
      take: limit,
      skip: offset,
      orderBy: { createdAt: "desc" },
      include: {
        results: {
          select: {
            price: true,
            currency: true,
            origin: true,
            destination: true,
          },
          orderBy: { price: "asc" },
        },
        task: {
          select: { id: true },
        },
      },
    });

    const total = await prisma.searchQuery.count();

    // Transform to HistoryItem format
    const historyItems: HistoryItem[] = searches.map((search) => {
      const parsed = search.parsed as {
        resolvedOrigin?: string;
        resolvedDestination?: string;
        resolvedDepartureDate?: string;
        resolvedReturnDate?: string;
        origin?: { iataCode?: string; city?: string };
        destination?: { iataCode?: string; city?: string };
      } | null;

      const cheapest = search.results[0];

      return {
        id: search.id,
        rawPrompt: search.rawPrompt,
        origin: parsed?.resolvedOrigin || cheapest?.origin || "???",
        destination: parsed?.resolvedDestination || cheapest?.destination || "???",
        departureDate: parsed?.resolvedDepartureDate || null,
        returnDate: parsed?.resolvedReturnDate || null,
        resultCount: search.results.length,
        cheapestPrice: cheapest?.price || null,
        currency: cheapest?.currency || "USD",
        createdAt: search.createdAt.toISOString(),
        hasTask: !!search.task,
      };
    });

    return NextResponse.json<HistoryResponse>({
      success: true,
      data: {
        searches: historyItems,
        total,
      },
    });
  } catch (error) {
    console.error("Get history error:", error);
    return NextResponse.json<HistoryErrorResponse>(
      { success: false, error: "Failed to fetch history" },
      { status: 500 }
    );
  }
}

// DELETE - Clear all history or delete specific search
export async function DELETE(request: NextRequest) {
  try {
    const authenticated = await isAuthenticated();
    if (!authenticated) {
      return NextResponse.json<HistoryErrorResponse>(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const searchId = searchParams.get("id");

    if (searchId) {
      // Delete specific search (cascade deletes results)
      await prisma.searchQuery.delete({
        where: { id: searchId },
      });

      return NextResponse.json({
        success: true,
        message: "Search deleted",
      });
    } else {
      // Clear all history
      // First delete searches that don't have associated tasks
      const deleted = await prisma.searchQuery.deleteMany({
        where: { task: null },
      });

      return NextResponse.json({
        success: true,
        message: `Cleared ${deleted.count} searches`,
        count: deleted.count,
      });
    }
  } catch (error) {
    console.error("Delete history error:", error);
    return NextResponse.json<HistoryErrorResponse>(
      { success: false, error: "Failed to delete history" },
      { status: 500 }
    );
  }
}
