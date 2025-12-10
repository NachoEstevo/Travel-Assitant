"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  History,
  RefreshCw,
  Loader2,
  Trash2,
  MoreVertical,
  Plane,
  Calendar,
  Search,
  Clock,
  DollarSign,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

import { HistoryItem } from "@/app/api/history/route";
import { toast } from "sonner";

const ITEMS_PER_PAGE = 10;

// Relative time formatting
function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? "s" : ""} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
}

function formatDate(dateString: string | null): string {
  if (!dateString) return "";
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function HistoryItemCard({
  item,
  onRerun,
  onCreateTask,
  onDelete,
  isRerunning,
}: {
  item: HistoryItem;
  onRerun: (item: HistoryItem) => void;
  onCreateTask: (item: HistoryItem) => void;
  onDelete: (id: string) => void;
  isRerunning: boolean;
}) {
  return (
    <Card className="card-hover group">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          {/* Route Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2">
              <div className="flex items-center gap-2 text-lg font-semibold">
                <span>{item.origin}</span>
                <Plane className="h-4 w-4 text-muted-foreground" />
                <span>{item.destination}</span>
              </div>
              {item.hasTask && (
                <Badge variant="secondary" className="text-xs">
                  <Clock className="h-3 w-3 mr-1" />
                  Tracked
                </Badge>
              )}
            </div>

            {/* Query snippet */}
            <p className="text-sm text-muted-foreground line-clamp-1 mb-2">
              {item.rawPrompt}
            </p>

            {/* Meta info */}
            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              {item.departureDate && (
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {formatDate(item.departureDate)}
                  {item.returnDate && ` - ${formatDate(item.returnDate)}`}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Search className="h-3 w-3" />
                {item.resultCount} results
              </span>
              <span>{formatRelativeTime(item.createdAt)}</span>
            </div>
          </div>

          {/* Price & Actions */}
          <div className="flex flex-col items-end gap-2">
            {item.cheapestPrice !== null && (
              <div className="text-right">
                <div className="text-lg font-bold">
                  {item.currency === "USD" ? "$" : item.currency}{" "}
                  {item.cheapestPrice.toLocaleString()}
                </div>
                <div className="text-xs text-muted-foreground">cheapest found</div>
              </div>
            )}

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => onRerun(item)}
                disabled={isRerunning}
              >
                {isRerunning ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                <span className="ml-1.5">Re-run</span>
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() => onCreateTask(item)}
                    disabled={item.hasTask}
                  >
                    <Clock className="h-4 w-4 mr-2" />
                    {item.hasTask ? "Already tracking" : "Create Task"}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => onDelete(item.id)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function HistoryItemSkeleton() {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-3">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-full max-w-md" />
            <div className="flex gap-3">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-16" />
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <Skeleton className="h-6 w-20" />
            <Skeleton className="h-8 w-24" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function HistoryPage() {
  const router = useRouter();
  const [searches, setSearches] = useState<HistoryItem[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [rerunningId, setRerunningId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const fetchHistory = useCallback(async (page: number = 1) => {
    try {
      const offset = (page - 1) * ITEMS_PER_PAGE;
      const response = await fetch(`/api/history?limit=${ITEMS_PER_PAGE}&offset=${offset}`);
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to fetch history");
      }

      setSearches(data.data.searches);
      setTotal(data.data.total);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load history");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory(currentPage);
  }, [fetchHistory, currentPage]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchHistory(currentPage);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const totalPages = Math.ceil(total / ITEMS_PER_PAGE);

  const handleRerun = async (item: HistoryItem) => {
    setRerunningId(item.id);
    try {
      // Re-run the same natural language query
      const response = await fetch("/api/flights/search-natural", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: item.rawPrompt }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Search failed");
      }

      // Store the search result in sessionStorage and navigate to home
      sessionStorage.setItem(
        "rerunSearch",
        JSON.stringify({
          searchId: data.data.searchId,
          flights: data.data.flights,
          carriers: data.data.dictionaries?.carriers,
          parsedQuery: data.data.parsedQuery,
          insight: data.data.insight,
          query: item.rawPrompt,
        })
      );

      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to re-run search");
    } finally {
      setRerunningId(null);
    }
  };

  const handleCreateTask = (item: HistoryItem) => {
    // Store search params and navigate to tasks page with create dialog
    sessionStorage.setItem(
      "createTaskFrom",
      JSON.stringify({
        origin: item.origin,
        destination: item.destination,
        departureDate: item.departureDate,
        returnDate: item.returnDate,
        name: `${item.origin} → ${item.destination}`,
      })
    );

    router.push("/tasks?create=true");
  };

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/history?id=${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete");
      }

      setSearches((prev) => prev.filter((s) => s.id !== id));
      setTotal((prev) => prev - 1);
      toast.success("Search deleted");
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Failed to delete";
      setError(errorMsg);
      toast.error(errorMsg);
    }
  };

  const handleClearAll = async () => {
    try {
      const response = await fetch("/api/history", {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to clear history");
      }

      toast.success(`Cleared ${data.count} searches`);
      // Refresh to get any remaining searches (those with tasks)
      await fetchHistory(currentPage);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Failed to clear history";
      setError(errorMsg);
      toast.error(errorMsg);
    }
  };

  // Stats
  const searchesWithResults = searches.filter((s) => s.resultCount > 0).length;
  const avgPrice =
    searches.length > 0
      ? searches
          .filter((s) => s.cheapestPrice !== null)
          .reduce((sum, s) => sum + (s.cheapestPrice || 0), 0) /
        searches.filter((s) => s.cheapestPrice !== null).length
      : 0;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold">Search History</h1>
          <p className="text-muted-foreground">
            View and revisit your past flight searches
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            {isRefreshing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
          {searches.length > 0 && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Clear All
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Clear Search History?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will delete all searches that aren&apos;t linked to scheduled
                    tasks. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleClearAll}>
                    Clear History
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>

      {/* Stats */}
      {searches.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <Card className="bg-muted/30">
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Search className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-semibold">{total}</p>
                  <p className="text-xs text-muted-foreground">Total Searches</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-muted/30">
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Plane className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-semibold">{searchesWithResults}</p>
                  <p className="text-xs text-muted-foreground">With Results</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-muted/30">
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <DollarSign className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-semibold">
                    {avgPrice > 0 ? `$${Math.round(avgPrice).toLocaleString()}` : "-"}
                  </p>
                  <p className="text-xs text-muted-foreground">Avg Cheapest</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="p-4 rounded-lg bg-destructive/10 text-destructive">
          {error}
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="space-y-4">
          <HistoryItemSkeleton />
          <HistoryItemSkeleton />
          <HistoryItemSkeleton />
        </div>
      )}

      {/* Empty State */}
      {!isLoading && searches.length === 0 && (
        <Card className="border-dashed">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-2">
              <History className="h-6 w-6 text-muted-foreground" />
            </div>
            <CardTitle>No Search History</CardTitle>
            <CardDescription>
              Your search history will appear here after you perform your first
              search.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center pb-6">
            <Button onClick={() => router.push("/")}>
              <Search className="h-4 w-4 mr-2" />
              Start Searching
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Search List */}
      {!isLoading && searches.length > 0 && (
        <div className="space-y-3">
          {searches.map((item) => (
            <HistoryItemCard
              key={item.id}
              item={item}
              onRerun={handleRerun}
              onCreateTask={handleCreateTask}
              onDelete={handleDelete}
              isRerunning={rerunningId === item.id}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {!isLoading && totalPages > 1 && (
        <HistoryPagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={total}
          itemsPerPage={ITEMS_PER_PAGE}
          onPageChange={handlePageChange}
        />
      )}
    </div>
  );
}

interface HistoryPaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
}

function HistoryPagination({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onPageChange,
}: HistoryPaginationProps) {
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  return (
    <div className="flex items-center justify-between py-4 border-t border-border">
      <p className="text-sm text-muted-foreground">
        Showing {startItem}-{endItem} of {totalItems} searches
      </p>

      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <span className="px-3 text-sm text-muted-foreground">
          Page {currentPage} of {totalPages}
        </span>

        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
