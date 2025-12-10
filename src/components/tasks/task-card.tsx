"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Plane,
  Clock,
  Calendar,
  DollarSign,
  TrendingDown,
  TrendingUp,
  Play,
  Trash2,
  MoreVertical,
  Bell,
  Loader2,
  RefreshCw,
  BarChart3,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export interface TaskData {
  id: string;
  name: string;
  origin: string;
  destination: string;
  departureDate: string;
  returnDate?: string | null;
  adults: number;
  travelClass: string;
  cronExpr: string;
  priceTarget?: number | null;
  active: boolean;
  lastRun?: string | null;
  nextRun?: string | null;
  lastPrice?: number | null;
  lowestPrice?: number | null;
  createdAt: string;
  _count?: {
    priceHistory: number;
    notifications: number;
  };
}

interface TaskCardProps {
  task: TaskData;
  onToggleActive: (id: string, active: boolean) => Promise<void>;
  onRun: (id: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onEdit?: (task: TaskData) => void;
  onViewDetails?: (task: TaskData) => void;
}

export function TaskCard({
  task,
  onToggleActive,
  onRun,
  onDelete,
  onEdit,
  onViewDetails,
}: TaskCardProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleRun = async () => {
    setIsRunning(true);
    try {
      await onRun(task.id);
    } finally {
      setIsRunning(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await onDelete(task.id);
    } finally {
      setIsDeleting(false);
    }
  };

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatPrice = (price: number | null | undefined) => {
    if (price == null) return "—";
    return `$${Math.round(price)}`;
  };

  const priceChange =
    task.lastPrice && task.lowestPrice
      ? task.lastPrice - task.lowestPrice
      : null;

  return (
    <Card
      className={cn(
        "transition-all hover:shadow-md",
        !task.active && "opacity-60"
      )}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="font-display text-lg flex items-center gap-2">
              {task.name}
              {!task.active && (
                <Badge variant="secondary" className="text-xs">
                  Paused
                </Badge>
              )}
            </CardTitle>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Plane className="h-4 w-4" />
              <span className="font-mono font-semibold">
                {task.origin} → {task.destination}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Switch
              checked={task.active}
              onCheckedChange={(checked) => onToggleActive(task.id, checked)}
            />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {onViewDetails && (
                  <DropdownMenuItem onClick={() => onViewDetails(task)}>
                    <BarChart3 className="h-4 w-4 mr-2" />
                    View Details
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={handleRun} disabled={isRunning}>
                  {isRunning ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Play className="h-4 w-4 mr-2" />
                  )}
                  Run Now
                </DropdownMenuItem>
                {onEdit && (
                  <DropdownMenuItem onClick={() => onEdit(task)}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Edit
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="text-destructive focus:text-destructive"
                >
                  {isDeleting ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4 mr-2" />
                  )}
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Schedule Info */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div className="space-y-1">
            <div className="text-muted-foreground flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              Departure
            </div>
            <div className="font-medium">{task.departureDate}</div>
          </div>

          <div className="space-y-1">
            <div className="text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Next Run
            </div>
            <div className="font-medium">{formatDate(task.nextRun)}</div>
          </div>

          <div className="space-y-1">
            <div className="text-muted-foreground flex items-center gap-1">
              <DollarSign className="h-3 w-3" />
              Last Price
            </div>
            <div className="font-medium">{formatPrice(task.lastPrice)}</div>
          </div>

          <div className="space-y-1">
            <div className="text-muted-foreground flex items-center gap-1">
              <TrendingDown className="h-3 w-3" />
              Lowest
            </div>
            <div className="font-medium text-green-600">
              {formatPrice(task.lowestPrice)}
            </div>
          </div>
        </div>

        {/* Price Change & Target */}
        <div className="flex items-center gap-4 flex-wrap">
          {priceChange !== null && priceChange !== 0 && (
            <Badge
              variant="outline"
              className={cn(
                priceChange > 0
                  ? "text-red-600 border-red-200"
                  : "text-green-600 border-green-200"
              )}
            >
              {priceChange > 0 ? (
                <TrendingUp className="h-3 w-3 mr-1" />
              ) : (
                <TrendingDown className="h-3 w-3 mr-1" />
              )}
              {priceChange > 0 ? "+" : ""}${Math.round(priceChange)} from lowest
            </Badge>
          )}

          {task.priceTarget && (
            <Badge variant="outline" className="text-primary border-primary/30">
              <Bell className="h-3 w-3 mr-1" />
              Alert at ${task.priceTarget}
            </Badge>
          )}

          <Badge variant="secondary" className="capitalize">
            {task.travelClass.toLowerCase().replace("_", " ")}
          </Badge>

          {task._count && task._count.priceHistory > 0 && (
            <span className="text-xs text-muted-foreground">
              {task._count.priceHistory} price checks
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Skeleton for loading state
export function TaskCardSkeleton() {
  return (
    <Card className="animate-pulse">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <div className="h-5 w-40 bg-muted rounded" />
            <div className="h-4 w-24 bg-muted rounded" />
          </div>
          <div className="h-6 w-12 bg-muted rounded" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="space-y-2">
              <div className="h-3 w-16 bg-muted rounded" />
              <div className="h-4 w-20 bg-muted rounded" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
