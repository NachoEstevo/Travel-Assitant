/**
 * Flight Export Utilities
 *
 * Generate .ics calendar files and formatted text for clipboard
 */

import { NormalizedFlight, formatDuration } from "./amadeus";

/**
 * Generate an ICS calendar file content for a flight
 */
export function generateICS(flight: NormalizedFlight): string {
  const outbound = flight.legs[0];
  const returnLeg = flight.legs[1];

  const formatICSDate = (isoString: string) => {
    // Format: YYYYMMDDTHHMMSSZ
    const date = new Date(isoString);
    return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  };

  const escapeICS = (text: string) => {
    return text.replace(/[,;\\]/g, "\\$&").replace(/\n/g, "\\n");
  };

  const now = new Date().toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  const uid = `flight-${flight.id}-${Date.now()}@personaltravel.app`;

  let events = "";

  // Outbound flight event
  const outboundDesc = [
    `Flight: ${outbound.segments.map(s => s.flightNumber).join(", ")}`,
    `Airlines: ${flight.airlines.join(", ")}`,
    `Duration: ${formatDuration(outbound.duration)}`,
    outbound.stops > 0 ? `Stops: ${outbound.stops}` : "Direct flight",
    `Price: $${Math.round(flight.price)} ${flight.currency}`,
    "",
    "Segments:",
    ...outbound.segments.map(
      (s) => `${s.origin} → ${s.destination} (${s.flightNumber})`
    ),
  ].join("\\n");

  events += `BEGIN:VEVENT
DTSTART:${formatICSDate(outbound.departureAt)}
DTEND:${formatICSDate(outbound.arrivalAt)}
DTSTAMP:${now}
UID:${uid}-outbound
SUMMARY:✈️ ${outbound.origin} → ${outbound.destination}
DESCRIPTION:${escapeICS(outboundDesc)}
LOCATION:${outbound.origin} Airport
STATUS:CONFIRMED
END:VEVENT
`;

  // Return flight event if exists
  if (returnLeg) {
    const returnDesc = [
      `Flight: ${returnLeg.segments.map(s => s.flightNumber).join(", ")}`,
      `Airlines: ${flight.airlines.join(", ")}`,
      `Duration: ${formatDuration(returnLeg.duration)}`,
      returnLeg.stops > 0 ? `Stops: ${returnLeg.stops}` : "Direct flight",
      "",
      "Segments:",
      ...returnLeg.segments.map(
        (s) => `${s.origin} → ${s.destination} (${s.flightNumber})`
      ),
    ].join("\\n");

    events += `BEGIN:VEVENT
DTSTART:${formatICSDate(returnLeg.departureAt)}
DTEND:${formatICSDate(returnLeg.arrivalAt)}
DTSTAMP:${now}
UID:${uid}-return
SUMMARY:✈️ ${returnLeg.origin} → ${returnLeg.destination} (Return)
DESCRIPTION:${escapeICS(returnDesc)}
LOCATION:${returnLeg.origin} Airport
STATUS:CONFIRMED
END:VEVENT
`;
  }

  return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//PersonalTravel//Flight Export//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
X-WR-CALNAME:Flight Itinerary
${events}END:VCALENDAR`;
}

/**
 * Download ICS file
 */
export function downloadICS(flight: NormalizedFlight) {
  const ics = generateICS(flight);
  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = `flight-${flight.legs[0].origin}-${flight.legs[0].destination}.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Generate formatted text for clipboard
 */
export function generateClipboardText(flight: NormalizedFlight): string {
  const outbound = flight.legs[0];
  const returnLeg = flight.legs[1];

  const formatDate = (iso: string) => {
    const date = new Date(iso);
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatTime = (iso: string) => {
    const date = new Date(iso);
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  };

  let text = `✈️ Flight Details\n`;
  text += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

  // Outbound
  text += `📍 Outbound: ${outbound.origin} → ${outbound.destination}\n`;
  text += `📅 ${formatDate(outbound.departureAt)}\n`;
  text += `⏰ ${formatTime(outbound.departureAt)} - ${formatTime(outbound.arrivalAt)}\n`;
  text += `⏱️ Duration: ${formatDuration(outbound.duration)}\n`;
  text += outbound.stops === 0
    ? `✅ Direct flight\n`
    : `🔄 ${outbound.stops} stop(s)\n`;
  text += `🛫 Flights: ${outbound.segments.map(s => s.flightNumber).join(", ")}\n`;

  // Return if exists
  if (returnLeg) {
    text += `\n📍 Return: ${returnLeg.origin} → ${returnLeg.destination}\n`;
    text += `📅 ${formatDate(returnLeg.departureAt)}\n`;
    text += `⏰ ${formatTime(returnLeg.departureAt)} - ${formatTime(returnLeg.arrivalAt)}\n`;
    text += `⏱️ Duration: ${formatDuration(returnLeg.duration)}\n`;
    text += returnLeg.stops === 0
      ? `✅ Direct flight\n`
      : `🔄 ${returnLeg.stops} stop(s)\n`;
    text += `🛫 Flights: ${returnLeg.segments.map(s => s.flightNumber).join(", ")}\n`;
  }

  text += `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  text += `💰 Total Price: $${Math.round(flight.price)} ${flight.currency}\n`;
  text += `🏷️ Airlines: ${flight.airlines.join(", ")}\n`;
  text += `📋 Booking ID: ${flight.id}\n`;
  text += `⏳ Book by: ${new Date(flight.lastTicketingDate).toLocaleDateString()}\n`;

  return text;
}

/**
 * Copy flight details to clipboard
 */
export async function copyToClipboard(flight: NormalizedFlight): Promise<boolean> {
  const text = generateClipboardText(flight);

  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    // Fallback for older browsers
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();

    try {
      document.execCommand("copy");
      return true;
    } catch {
      return false;
    } finally {
      document.body.removeChild(textarea);
    }
  }
}

/**
 * Share flight via native Web Share API
 */
export async function shareNative(flight: NormalizedFlight): Promise<boolean> {
  if (!navigator.share) {
    return false;
  }

  const outbound = flight.legs[0];
  const text = generateClipboardText(flight);

  try {
    await navigator.share({
      title: `Flight: ${outbound.origin} → ${outbound.destination}`,
      text,
    });
    return true;
  } catch {
    return false;
  }
}
