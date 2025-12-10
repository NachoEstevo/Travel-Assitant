/**
 * Notification Service
 *
 * Coordinates sending notifications across different channels (email, Telegram)
 * and records them in the database.
 */

import { prisma } from "./db";
import { sendPriceAlertEmail, PriceAlertData, isEmailConfigured } from "./resend";
import { sendTelegramPriceAlert, isTelegramConfigured } from "./telegram";
import { TaskExecutionResult } from "./scheduler";

export type NotificationType = "PRICE_DROP" | "PRICE_TARGET" | "NEW_LOW" | "PRICE_UPDATE";

export interface NotificationResult {
  sent: boolean;
  channel: "EMAIL" | "TELEGRAM";
  error?: string;
}

/**
 * Determine if a notification should be sent based on task result
 */
export function shouldNotify(result: TaskExecutionResult): {
  shouldSend: boolean;
  type: NotificationType;
} {
  if (!result.success || !result.currentPrice) {
    return { shouldSend: false, type: "PRICE_UPDATE" };
  }

  // Always notify if price target is hit
  if (result.hitPriceTarget) {
    return { shouldSend: true, type: "PRICE_TARGET" };
  }

  // Notify on new low price
  if (result.isNewLow) {
    return { shouldSend: true, type: "NEW_LOW" };
  }

  // Notify on significant price drop (> 5%)
  if (result.priceChangePercent && result.priceChangePercent <= -5) {
    return { shouldSend: true, type: "PRICE_DROP" };
  }

  return { shouldSend: false, type: "PRICE_UPDATE" };
}

/**
 * Send notifications for a task result
 */
export async function sendNotifications(
  taskId: string,
  result: TaskExecutionResult
): Promise<NotificationResult[]> {
  const { shouldSend, type } = shouldNotify(result);

  if (!shouldSend) {
    return [];
  }

  // Get task details
  const task = await prisma.scheduledTask.findUnique({
    where: { id: taskId },
  });

  if (!task) {
    return [];
  }

  const results: NotificationResult[] = [];

  // Build notification data
  const alertData: PriceAlertData = {
    taskName: task.name,
    origin: task.origin,
    destination: task.destination,
    departureDate: task.departureDate,
    returnDate: task.returnDate,
    currentPrice: result.currentPrice!,
    previousPrice: result.previousPrice,
    lowestPrice: task.lowestPrice || undefined,
    priceTarget: task.priceTarget,
    currency: result.bestFlight?.currency || "USD",
    airlines: result.bestFlight?.airlines || [],
    isNewLow: result.isNewLow || false,
    hitPriceTarget: result.hitPriceTarget || false,
  };

  // Send email notification
  if (isEmailConfigured()) {
    const emailResult = await sendPriceAlertEmail(alertData);
    results.push({
      sent: emailResult.success,
      channel: "EMAIL",
      error: emailResult.error,
    });

    // Record notification in database
    if (emailResult.success) {
      await recordNotification(taskId, type, "EMAIL", alertData);
    }
  }

  // Send Telegram notification
  if (isTelegramConfigured()) {
    const telegramResult = await sendTelegramPriceAlert(alertData);
    results.push({
      sent: telegramResult.success,
      channel: "TELEGRAM",
      error: telegramResult.error,
    });

    // Record notification in database
    if (telegramResult.success) {
      await recordNotification(taskId, type, "TELEGRAM", alertData);
    }
  }

  return results;
}

/**
 * Record a sent notification in the database
 */
async function recordNotification(
  taskId: string,
  type: NotificationType,
  channel: "EMAIL" | "TELEGRAM",
  data: PriceAlertData
): Promise<void> {
  try {
    await prisma.notification.create({
      data: {
        taskId,
        type,
        channel,
        payload: {
          price: data.currentPrice,
          previousPrice: data.previousPrice,
          lowestPrice: data.lowestPrice,
          priceTarget: data.priceTarget,
          message: buildNotificationMessage(type, data),
          origin: data.origin,
          destination: data.destination,
          airlines: data.airlines,
        },
        sentAt: new Date(),
      },
    });
  } catch (error) {
    console.error("Failed to record notification:", error);
  }
}

/**
 * Build a short message describing the notification
 */
function buildNotificationMessage(type: NotificationType, data: PriceAlertData): string {
  const route = `${data.origin} → ${data.destination}`;
  const price = `$${Math.round(data.currentPrice)}`;

  switch (type) {
    case "PRICE_TARGET":
      return `${route} hit price target of $${data.priceTarget} - now ${price}`;
    case "NEW_LOW":
      return `${route} reached new low price: ${price}`;
    case "PRICE_DROP":
      const drop = data.previousPrice ? Math.round(data.previousPrice - data.currentPrice) : 0;
      return `${route} dropped $${drop} to ${price}`;
    default:
      return `${route} price update: ${price}`;
  }
}

/**
 * Get recent notifications for a task
 */
export async function getTaskNotifications(taskId: string, limit = 20) {
  return prisma.notification.findMany({
    where: { taskId },
    orderBy: { sentAt: "desc" },
    take: limit,
  });
}

/**
 * Get all recent notifications
 */
export async function getRecentNotifications(limit = 50) {
  return prisma.notification.findMany({
    orderBy: { sentAt: "desc" },
    take: limit,
    include: {
      task: {
        select: {
          name: true,
          origin: true,
          destination: true,
        },
      },
    },
  });
}
