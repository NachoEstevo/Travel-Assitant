/**
 * Cron utilities - client-safe
 *
 * Constants and utilities for cron expressions that can be used on both client and server.
 */

/**
 * Common cron presets
 */
export const CRON_PRESETS = [
  { label: "Every 6 hours", value: "0 */6 * * *" },
  { label: "Every 12 hours", value: "0 */12 * * *" },
  { label: "Daily at 9 AM", value: "0 9 * * *" },
  { label: "Twice daily (9 AM, 6 PM)", value: "0 9,18 * * *" },
  { label: "Weekly (Monday 9 AM)", value: "0 9 * * 1" },
  { label: "Twice weekly (Mon, Thu)", value: "0 9 * * 1,4" },
] as const;

/**
 * Get human-readable description of cron schedule
 */
export function describeCronSchedule(cronExpr: string): string {
  // Common patterns
  const patterns: Record<string, string> = {
    "0 9 * * *": "Daily at 9:00 AM",
    "0 9,18 * * *": "Daily at 9:00 AM and 6:00 PM",
    "0 9 * * 1": "Every Monday at 9:00 AM",
    "0 9 * * 1,4": "Every Monday and Thursday at 9:00 AM",
    "0 0 * * *": "Daily at midnight",
    "0 */6 * * *": "Every 6 hours",
    "0 */12 * * *": "Every 12 hours",
  };

  if (patterns[cronExpr]) {
    return patterns[cronExpr];
  }

  // Try to parse and give a basic description
  try {
    const parts = cronExpr.split(" ");
    if (parts.length === 5) {
      const [minute, hour] = parts;

      if (hour === "*") {
        return `Every hour at minute ${minute}`;
      }

      if (hour.includes(",")) {
        const hours = hour.split(",").map((h) => `${h}:${minute.padStart(2, "0")}`);
        return `Daily at ${hours.join(" and ")}`;
      }

      if (hour.includes("/")) {
        const interval = hour.split("/")[1];
        return `Every ${interval} hours`;
      }

      return `Daily at ${hour}:${minute.padStart(2, "0")}`;
    }
  } catch {
    // Fall through
  }

  return cronExpr;
}
