export const safeName = (value) => String(value).replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase() || "smarttrip";
export function csvCell(value) {
  let text = String(value ?? "");
  if (/^\s*[=+@-]/.test(text) || /^[\t\r\n]/.test(text)) text = "'" + text;
  return `"${text.replaceAll('"', '""')}"`;
}
const dateOnly = (value) => new Date(value).toISOString().slice(0, 10);
const utcTime = (value) => new Date(value).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
const icsText = (value) => String(value ?? "").replaceAll("\\", "\\\\").replace(/\r\n|\r|\n/g, "\\n").replaceAll(",", "\\,").replaceAll(";", "\\;");
export function foldCalendarLine(line) {
  const encoder = new TextEncoder();
  let result = "", count = 0;
  for (const char of line) {
    const size = encoder.encode(char).length;
    if (count + size > 75) { result += "\r\n "; count = 1; }
    result += char;
    count += size;
  }
  return result;
}
export function tripCsv(trip) {
  const rows = [["Day", "Date", "Start", "Activity", "Location", "Duration (min)", "Estimated cost (PHP)", "Notes"],
    ...trip.days.flatMap(day => day.activities.map(activity => [day.dayNumber, dateOnly(day.date), activity.startTime || "", activity.title, activity.location || "", activity.durationMin ?? "", Number(activity.estimatedCost || 0), activity.notes || ""]))];
  return "\uFEFF" + rows.map(row => row.map(csvCell).join(",")).join("\r\n");
}
export function tripCalendar(trip, now = new Date()) {
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//SmartTrip PH//Itinerary//EN", "CALSCALE:GREGORIAN"];
  for (const day of trip.days) {
    for (const activity of day.activities) {
      const time = /^([01]\d|2[0-3]):[0-5]\d$/.test(activity.startTime || "") ? activity.startTime : "09:00";
      // Interpret itinerary times in the Philippines, independent of the viewer's timezone.
      const start = new Date(`${dateOnly(day.date)}T${time}:00+08:00`);
      const duration = Number(activity.durationMin);
      const end = new Date(start.getTime() + (Number.isFinite(duration) && duration > 0 ? duration : 60) * 60000);
      lines.push("BEGIN:VEVENT", `UID:${icsText(activity.id)}@smarttrip-ph`, `DTSTAMP:${utcTime(now)}`, `DTSTART:${utcTime(start)}`, `DTEND:${utcTime(end)}`, `SUMMARY:${icsText(activity.title)}`, `LOCATION:${icsText(activity.location)}`, `DESCRIPTION:${icsText(activity.description || activity.notes)}`, "END:VEVENT");
    }
  }
  lines.push("END:VCALENDAR");
  return lines.map(foldCalendarLine).join("\r\n") + "\r\n";
}
