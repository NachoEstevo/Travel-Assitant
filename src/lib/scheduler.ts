/**
 * Task Scheduler Service
 *
 * Handles scheduled flight searches, price tracking, and notifications.
 */

import { CronExpressionParser } from "cron-parser";
import { prisma } from "./db";
import { searchFlights, NormalizedFlight } from "./amadeus";
import { sendNotifications } from "./notifications";

export interface TaskExecutionResult {
  taskId: string;
  success: boolean;
  currentPrice?: number;
  previousPrice?: number;
  priceChange?: number;
  priceChangePercent?: number;
  isNewLow?: boolean;
  hitPriceTarget?: boolean;
  bestFlight?: NormalizedFlight;
  error?: string;
}

/**
 * Calculate the next run time from a cron expression
 */
export function getNextRunTime(cronExpr: string, fromDate?: Date): Date {
  try {
    const interval = CronExpressionParser.parse(cronExpr, {
      currentDate: fromDate || new Date(),
    });
    return interval.next().toDate();
  } catch (error) {
    console.error("Invalid cron expression:", cronExpr, error);
    // Default to 24 hours from now if cron is invalid
    const next = new Date();
    next.setHours(next.getHours() + 24);
    return next;
  }
}

/**
 * Parse relative date strings like "+30d" to actual dates
 */
export function parseRelativeDate(dateStr: string): string {
  if (!dateStr.startsWith("+")) {
    return dateStr; // Already a YYYY-MM-DD date
  }

  const match = dateStr.match(/^\+(\d+)([dwm])$/);
  if (!match) {
    return dateStr;
  }

  const [, amount, unit] = match;
  const date = new Date();

  switch (unit) {
    case "d":
      date.setDate(date.getDate() + parseInt(amount));
      break;
    case "w":
      date.setDate(date.getDate() + parseInt(amount) * 7);
      break;
    case "m":
      date.setMonth(date.getMonth() + parseInt(amount));
      break;
  }

  return date.toISOString().split("T")[0];
}

/**
 * Execute a scheduled task
 */
export async function executeTask(taskId: string): Promise<TaskExecutionResult> {
  const task = await prisma.scheduledTask.findUnique({
    where: { id: taskId },
    include: {
      priceHistory: {
        orderBy: { recordedAt: "desc" },
        take: 1,
      },
    },
  });

  if (!task) {
    return { taskId, success: false, error: "Task not found" };
  }

  if (!task.active) {
    return { taskId, success: false, error: "Task is inactive" };
  }

  try {
    // Parse dates (handle relative dates)
    const departureDate = parseRelativeDate(task.departureDate);
    const returnDate = task.returnDate ? parseRelativeDate(task.returnDate) : undefined;

    // Check if departure date is in the past
    if (new Date(departureDate) < new Date()) {
      return { taskId, success: false, error: "Departure date is in the past" };
    }

    // Execute the search
    const result = await searchFlights({
      originLocationCode: task.origin,
      destinationLocationCode: task.destination,
      departureDate,
      returnDate,
      adults: task.adults,
      travelClass: task.travelClass as "ECONOMY" | "PREMIUM_ECONOMY" | "BUSINESS" | "FIRST",
      max: 5,
    });

    if (result.flights.length === 0) {
      // Update last run time even if no results
      await prisma.scheduledTask.update({
        where: { id: taskId },
        data: {
          lastRun: new Date(),
          nextRun: getNextRunTime(task.cronExpr),
        },
      });

      return { taskId, success: true, error: "No flights found" };
    }

    const bestFlight = result.flights[0];
    const currentPrice = bestFlight.price;
    const previousPrice = task.lastPrice || undefined;
    const lowestPrice = task.lowestPrice || currentPrice;

    // Calculate price changes
    const priceChange = previousPrice ? currentPrice - previousPrice : 0;
    const priceChangePercent = previousPrice
      ? Math.round((priceChange / previousPrice) * 100)
      : 0;
    const isNewLow = currentPrice < lowestPrice;
    const hitPriceTarget = task.priceTarget ? currentPrice <= task.priceTarget : false;

    // Record price history
    // Calculate total stops from all legs
    const totalStops = bestFlight.legs.reduce((acc, leg) => acc + leg.stops, 0);

    await prisma.priceHistory.create({
      data: {
        taskId,
        price: currentPrice,
        currency: bestFlight.currency,
        airlines: bestFlight.airlines,
        stops: totalStops,
        duration: bestFlight.totalDuration,
      },
    });

    // Update task with latest info
    await prisma.scheduledTask.update({
      where: { id: taskId },
      data: {
        lastRun: new Date(),
        nextRun: getNextRunTime(task.cronExpr),
        lastPrice: currentPrice,
        lowestPrice: isNewLow ? currentPrice : lowestPrice,
      },
    });

    const executionResult: TaskExecutionResult = {
      taskId,
      success: true,
      currentPrice,
      previousPrice,
      priceChange,
      priceChangePercent,
      isNewLow,
      hitPriceTarget,
      bestFlight,
    };

    // Send notifications if applicable
    try {
      await sendNotifications(taskId, executionResult);
    } catch (notificationError) {
      console.error("Failed to send notifications:", notificationError);
      // Don't fail the task execution if notifications fail
    }

    return executionResult;
  } catch (error) {
    console.error(`Task execution failed for ${taskId}:`, error);

    // Update last run time even on error
    await prisma.scheduledTask.update({
      where: { id: taskId },
      data: {
        lastRun: new Date(),
        nextRun: getNextRunTime(task.cronExpr),
      },
    });

    return {
      taskId,
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Get all tasks that are due to run
 */
export async function getDueTasks() {
  return prisma.scheduledTask.findMany({
    where: {
      active: true,
      nextRun: {
        lte: new Date(),
      },
    },
  });
}

/**
 * Run all due tasks
 */
export async function runDueTasks(): Promise<TaskExecutionResult[]> {
  const dueTasks = await getDueTasks();
  const results: TaskExecutionResult[] = [];

  for (const task of dueTasks) {
    const result = await executeTask(task.id);
    results.push(result);

    // Add a small delay between tasks to avoid rate limiting
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  return results;
}

/**
 * Validate a cron expression
 */
export function isValidCron(cronExpr: string): boolean {
  try {
    CronExpressionParser.parse(cronExpr);
    return true;
  } catch {
    return false;
  }
}

// Re-export cron utilities for convenience
export { CRON_PRESETS, describeCronSchedule } from "./cron-utils";

/**
 * Check price alerts and trigger notifications if conditions are met
 */
export interface AlertCheckResult {
  alertId: string;
  success: boolean;
  triggered: boolean;
  currentPrice?: number;
  targetPrice?: number;
  error?: string;
}

export async function checkPriceAlerts(): Promise<AlertCheckResult[]> {
  // Get all active alerts that haven't expired
  const alerts = await prisma.priceAlert.findMany({
    where: {
      active: true,
      triggered: false,
      expiresAt: {
        gt: new Date(),
      },
    },
  });

  const results: AlertCheckResult[] = [];

  for (const alert of alerts) {
    try {
      // Search for flights on this route
      const result = await searchFlights({
        originLocationCode: alert.origin,
        destinationLocationCode: alert.destination,
        departureDate: alert.departureDate.toISOString().split("T")[0],
        returnDate: alert.returnDate?.toISOString().split("T")[0],
        adults: 1,
        travelClass: "ECONOMY",
        max: 1, // We only need the cheapest
      });

      if (result.flights.length === 0) {
        results.push({
          alertId: alert.id,
          success: true,
          triggered: false,
          error: "No flights found",
        });
        continue;
      }

      const cheapestPrice = result.flights[0].price;

      // Update current price
      await prisma.priceAlert.update({
        where: { id: alert.id },
        data: { currentPrice: cheapestPrice },
      });

      // Check if price dropped below target
      if (cheapestPrice <= alert.targetPrice) {
        // Trigger the alert
        await prisma.priceAlert.update({
          where: { id: alert.id },
          data: {
            triggered: true,
            notifiedAt: new Date(),
          },
        });

        // Send notification (reuse notification system)
        try {
          const { sendEmailNotification, sendTelegramNotification } = await import("./notifications");

          const message = `Price Alert Triggered!\n\n${alert.origin} → ${alert.destination}\nTarget: $${alert.targetPrice}\nCurrent: $${Math.round(cheapestPrice)}\n\nDeparture: ${alert.departureDate.toLocaleDateString()}`;

          await Promise.all([
            sendEmailNotification({
              subject: `Price Drop: ${alert.origin} → ${alert.destination} now $${Math.round(cheapestPrice)}`,
              text: message,
              html: `<h2>Price Alert Triggered!</h2>
                <p><strong>${alert.origin} → ${alert.destination}</strong></p>
                <p>Target Price: $${alert.targetPrice}</p>
                <p>Current Price: <strong>$${Math.round(cheapestPrice)}</strong></p>
                <p>Departure: ${alert.departureDate.toLocaleDateString()}</p>
                <p><a href="https://www.google.com/travel/flights?q=flights%20from%20${alert.origin}%20to%20${alert.destination}%20on%20${alert.departureDate.toISOString().split("T")[0]}">Search on Google Flights</a></p>`,
            }),
            sendTelegramNotification(message),
          ]);
        } catch (notifyError) {
          console.error("Failed to send alert notification:", notifyError);
        }

        results.push({
          alertId: alert.id,
          success: true,
          triggered: true,
          currentPrice: cheapestPrice,
          targetPrice: alert.targetPrice,
        });
      } else {
        results.push({
          alertId: alert.id,
          success: true,
          triggered: false,
          currentPrice: cheapestPrice,
          targetPrice: alert.targetPrice,
        });
      }

      // Rate limiting delay
      await new Promise((resolve) => setTimeout(resolve, 500));
    } catch (error) {
      console.error(`Alert check failed for ${alert.id}:`, error);
      results.push({
        alertId: alert.id,
        success: false,
        triggered: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  // Clean up expired alerts
  await prisma.priceAlert.deleteMany({
    where: {
      expiresAt: {
        lt: new Date(),
      },
    },
  });

  return results;
}
