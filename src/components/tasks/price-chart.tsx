"use client";

import { useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingDown, TrendingUp, Minus } from "lucide-react";

export interface PricePoint {
  id: string;
  price: number;
  currency: string;
  airlines: string[];
  stops: number;
  duration?: string | null;
  recordedAt: string;
}

interface PriceChartProps {
  priceHistory: PricePoint[];
  priceTarget?: number | null;
  lowestPrice?: number | null;
  className?: string;
}

export function PriceChart({
  priceHistory,
  priceTarget,
  lowestPrice,
  className,
}: PriceChartProps) {
  // Format data for the chart
  const chartData = useMemo(() => {
    return [...priceHistory]
      .reverse()
      .map((point) => ({
        date: new Date(point.recordedAt).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        }),
        time: new Date(point.recordedAt).toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
        }),
        price: point.price,
        airlines: point.airlines.join(", "),
        stops: point.stops,
        duration: point.duration,
        fullDate: point.recordedAt,
      }));
  }, [priceHistory]);

  // Calculate stats
  const stats = useMemo(() => {
    if (priceHistory.length === 0) return null;

    const prices = priceHistory.map((p) => p.price);
    const currentPrice = prices[0];
    const previousPrice = prices[1];
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;

    const priceChange = previousPrice ? currentPrice - previousPrice : 0;
    const changePercent = previousPrice
      ? ((priceChange / previousPrice) * 100).toFixed(1)
      : "0";

    return {
      currentPrice,
      minPrice,
      maxPrice,
      avgPrice,
      priceChange,
      changePercent,
    };
  }, [priceHistory]);

  if (priceHistory.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="py-8 text-center">
          <p className="text-muted-foreground">No price history yet.</p>
          <p className="text-sm text-muted-foreground mt-1">
            Run the task to start tracking prices.
          </p>
        </CardContent>
      </Card>
    );
  }

  const currency = priceHistory[0]?.currency || "USD";

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-display">Price History</CardTitle>
          {stats && (
            <Badge
              variant="outline"
              className={
                stats.priceChange < 0
                  ? "text-green-600 border-green-200"
                  : stats.priceChange > 0
                  ? "text-red-600 border-red-200"
                  : ""
              }
            >
              {stats.priceChange < 0 ? (
                <TrendingDown className="h-3 w-3 mr-1" />
              ) : stats.priceChange > 0 ? (
                <TrendingUp className="h-3 w-3 mr-1" />
              ) : (
                <Minus className="h-3 w-3 mr-1" />
              )}
              {stats.priceChange > 0 ? "+" : ""}
              {stats.changePercent}%
            </Badge>
          )}
        </div>
        {stats && (
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>
              Current: <strong className="text-foreground">${Math.round(stats.currentPrice)}</strong>
            </span>
            <span>
              Lowest: <strong className="text-green-600">${Math.round(stats.minPrice)}</strong>
            </span>
            <span>
              Avg: <strong className="text-foreground">${Math.round(stats.avgPrice)}</strong>
            </span>
          </div>
        )}
      </CardHeader>

      <CardContent>
        <div className="h-[200px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                className="text-muted-foreground"
              />
              <YAxis
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `$${value}`}
                domain={["dataMin - 50", "dataMax + 50"]}
                className="text-muted-foreground"
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-popover border rounded-lg shadow-lg p-3 text-sm">
                        <p className="font-semibold text-lg">
                          ${Math.round(data.price)} {currency}
                        </p>
                        <p className="text-muted-foreground">
                          {data.date} at {data.time}
                        </p>
                        {data.airlines && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {data.airlines} • {data.stops} stop{data.stops !== 1 ? "s" : ""}
                            {data.duration && ` • ${data.duration}`}
                          </p>
                        )}
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Line
                type="monotone"
                dataKey="price"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={{ r: 4, fill: "hsl(var(--primary))" }}
                activeDot={{ r: 6 }}
              />
              {priceTarget && (
                <ReferenceLine
                  y={priceTarget}
                  stroke="hsl(var(--destructive))"
                  strokeDasharray="5 5"
                  label={{
                    value: `Target: $${priceTarget}`,
                    position: "right",
                    fill: "hsl(var(--destructive))",
                    fontSize: 11,
                  }}
                />
              )}
              {lowestPrice && (
                <ReferenceLine
                  y={lowestPrice}
                  stroke="hsl(142 76% 36%)"
                  strokeDasharray="5 5"
                  label={{
                    value: `Lowest: $${lowestPrice}`,
                    position: "left",
                    fill: "hsl(142 76% 36%)",
                    fontSize: 11,
                  }}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>

        <p className="text-xs text-muted-foreground mt-2 text-center">
          {priceHistory.length} price check{priceHistory.length !== 1 ? "s" : ""} recorded
        </p>
      </CardContent>
    </Card>
  );
}
