"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Plane,
  Calendar,
  Users,
  Clock,
  Bell,
  Play,
  Loader2,
  RefreshCw,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { PriceChart, PricePoint } from "./price-chart";
import { TaskData } from "./task-card";
import { describeCronSchedule } from "@/lib/cron-utils";
import { cn } from "@/lib/utils";

interface TaskWithHistory extends TaskData {
  priceHistory: PricePoint[];
}

interface TaskDetailDialogProps {
  taskId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRun?: (id: string) => Promise<void>;
}

export function TaskDetailDialog({
  taskId,
  open,
  onOpenChange,
  onRun,
}: TaskDetailDialogProps) {
  const [task, setTask] = useState<TaskWithHistory | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && taskId) {
      fetchTaskDetails();
    } else {
      setTask(null);
      setError(null);
    }
  }, [open, taskId]);

  const fetchTaskDetails = async () => {
    if (!taskId) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/tasks/${taskId}`);
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to fetch task details");
      }

      setTask(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load task");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRun = async () => {
    if (!taskId || !onRun) return;

    setIsRunning(true);
    try {
      await onRun(taskId);
      // Refresh to get updated price history
      await fetchTaskDetails();
    } finally {
      setIsRunning(false);
    }
  };

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const priceChange =
    task?.lastPrice && task?.lowestPrice
      ? task.lastPrice - task.lowestPrice
      : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        {isLoading ? (
          <TaskDetailSkeleton />
        ) : error ? (
          <div className="py-8 text-center">
            <p className="text-destructive">{error}</p>
            <Button variant="outline" onClick={fetchTaskDetails} className="mt-4">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        ) : task ? (
          <>
            <DialogHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <DialogTitle className="font-display text-xl flex items-center gap-2">
                    {task.name}
                    {!task.active && (
                      <Badge variant="secondary" className="text-xs">
                        Paused
                      </Badge>
                    )}
                  </DialogTitle>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Plane className="h-4 w-4" />
                    <span className="font-mono font-semibold">
                      {task.origin} → {task.destination}
                    </span>
                  </div>
                </div>
                {onRun && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRun}
                    disabled={isRunning}
                  >
                    {isRunning ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Play className="h-4 w-4 mr-2" />
                    )}
                    Run Now
                  </Button>
                )}
              </div>
            </DialogHeader>

            {/* Trip Details */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mt-4">
              <div className="space-y-1">
                <div className="text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Departure
                </div>
                <div className="font-medium">{task.departureDate}</div>
              </div>

              {task.returnDate && (
                <div className="space-y-1">
                  <div className="text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    Return
                  </div>
                  <div className="font-medium">{task.returnDate}</div>
                </div>
              )}

              <div className="space-y-1">
                <div className="text-muted-foreground flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  Travelers
                </div>
                <div className="font-medium">
                  {task.adults} Adult{task.adults !== 1 ? "s" : ""}
                </div>
              </div>

              <div className="space-y-1">
                <div className="text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Schedule
                </div>
                <div className="font-medium text-xs">
                  {describeCronSchedule(task.cronExpr)}
                </div>
              </div>
            </div>

            <Separator className="my-4" />

            {/* Price Stats */}
            <div className="flex items-center gap-4 flex-wrap">
              {task.lastPrice && (
                <div className="space-y-0.5">
                  <div className="text-xs text-muted-foreground">Current Price</div>
                  <div className="text-2xl font-semibold">${Math.round(task.lastPrice)}</div>
                </div>
              )}

              {task.lowestPrice && (
                <div className="space-y-0.5">
                  <div className="text-xs text-muted-foreground">Lowest Seen</div>
                  <div className="text-2xl font-semibold text-green-600">
                    ${Math.round(task.lowestPrice)}
                  </div>
                </div>
              )}

              {priceChange !== null && priceChange !== 0 && (
                <Badge
                  variant="outline"
                  className={cn(
                    "h-8",
                    priceChange > 0
                      ? "text-red-600 border-red-200"
                      : "text-green-600 border-green-200"
                  )}
                >
                  {priceChange > 0 ? (
                    <TrendingUp className="h-4 w-4 mr-1" />
                  ) : (
                    <TrendingDown className="h-4 w-4 mr-1" />
                  )}
                  {priceChange > 0 ? "+" : ""}${Math.round(priceChange)} from lowest
                </Badge>
              )}

              {task.priceTarget && (
                <Badge variant="outline" className="h-8 text-primary border-primary/30">
                  <Bell className="h-4 w-4 mr-1" />
                  Alert at ${task.priceTarget}
                </Badge>
              )}
            </div>

            {/* Price Chart */}
            <PriceChart
              priceHistory={task.priceHistory}
              priceTarget={task.priceTarget}
              lowestPrice={task.lowestPrice}
              className="mt-4"
            />

            {/* Run Info */}
            <div className="grid grid-cols-2 gap-4 text-sm mt-4 p-3 rounded-lg bg-muted/30">
              <div>
                <span className="text-muted-foreground">Last Run: </span>
                <span className="font-medium">{formatDate(task.lastRun)}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Next Run: </span>
                <span className="font-medium">{formatDate(task.nextRun)}</span>
              </div>
            </div>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function TaskDetailSkeleton() {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-32" />
      </div>
      <div className="grid grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-4 w-20" />
          </div>
        ))}
      </div>
      <Skeleton className="h-px w-full" />
      <div className="flex gap-4">
        <Skeleton className="h-12 w-24" />
        <Skeleton className="h-12 w-24" />
      </div>
      <Skeleton className="h-[200px] w-full" />
    </div>
  );
}
