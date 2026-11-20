/**
 * Utility formatters for RFQ pricing, dates, and British auction timers
 */

export function formatCurrency(amount) {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return "—";
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatDateTime(isoString) {
  if (!isoString) return "—";
  const date = new Date(isoString);
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
}

export function formatTimeOnly(isoString) {
  if (!isoString) return "—";
  const date = new Date(isoString);
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
}

export function getTimeRemaining(targetIsoString) {
  if (!targetIsoString) {
    return { isExpired: true, totalSeconds: 0, text: "00:00:00" };
  }

  // Parse ISO string (FastAPI returns UTC without trailing Z or with Z)
  const targetDate = new Date(
    targetIsoString.endsWith("Z") ? targetIsoString : `${targetIsoString}Z`
  );
  const now = new Date();
  const diffMs = targetDate.getTime() - now.getTime();

  if (diffMs <= 0) {
    return {
      isExpired: true,
      totalSeconds: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      text: "00:00:00",
    };
  }

  const totalSeconds = Math.floor(diffMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const pad = (n) => String(n).padStart(2, "0");

  return {
    isExpired: false,
    totalSeconds,
    hours,
    minutes,
    seconds,
    text: `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`,
  };
}

export function getTriggerModeLabel(mode) {
  switch (mode) {
    case "ANY_BID":
      return "Any Bid in Window";
    case "ANY_RANK_CHANGE":
      return "Any Supplier Rank Change";
    case "L1_RANK_CHANGE":
      return "Lowest Bidder (L1) Change";
    default:
      return mode || "British Auction";
  }
}
