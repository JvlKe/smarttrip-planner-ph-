export const peso = (value) =>
  new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);
export const dateLabel = (value) =>
  value
    ? new Date(value).toLocaleDateString("en-PH", {
        month: "short",
        day: "numeric",
        year: "numeric",
        timeZone: "UTC",
      })
    : "Dates to be decided";
export const tripDays = (trip) =>
  Math.max(
    0,
    Math.round(
      (Date.parse(trip.endDate) - Date.parse(trip.startDate)) / 86400000,
    ) + 1,
  ) || 0;
export const destinationName = (trip) =>
  trip.destination?.name || trip.customLocation || "Philippines";
export const statusLabel = (status) =>
  ({
    IN_PROGRESS: "Ongoing",
    UPCOMING: "Upcoming",
    PLANNING: "Planning",
    DRAFT: "Draft",
    CANCELLED: "Cancelled",
    ARCHIVED: "Archived",
    COMPLETED: "Completed",
  })[status] || "Planning";
export function summarizeTrips(trips) {
  const active = trips.filter(
    (t) => !["ARCHIVED", "CANCELLED"].includes(t.status),
  );
  return {
    total: active.length,
    upcoming: active.filter((t) => ["UPCOMING", "PLANNING"].includes(t.status))
      .length,
    completed: active.filter((t) => t.status === "COMPLETED").length,
    destinations: new Set(active.map(destinationName)).size,
    days: active.reduce((sum, t) => sum + tripDays(t), 0),
    budget: active.reduce((sum, t) => sum + Number(t.totalBudget || 0), 0),
  };
}
export function saveDownload(value, filename, type = "application/json") {
  const url = URL.createObjectURL(new Blob([value], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
