const safeName = (value) =>
  value
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
const download = (name, type, content) => {
  const link = document.createElement("a");
  link.download = name;
  link.href = URL.createObjectURL(new Blob([content], { type }));
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
};
const csvCell = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`;
const icsText = (value) =>
  String(value ?? "")
    .replaceAll("\\", "\\\\")
    .replaceAll("\n", "\\n")
    .replaceAll(",", "\\,")
    .replaceAll(";", "\\;");
const calendarTime = (date, time = "09:00") => {
  const day = new Date(date).toISOString().slice(0, 10).replaceAll("-", "");
  return `${day}T${time.replace(":", "")}00`;
};

export default function TripExportMenu({ trip }) {
  function exportCsv() {
    const rows = [
      [
        "Day",
        "Date",
        "Start",
        "Activity",
        "Location",
        "Duration (min)",
        "Estimated cost (PHP)",
        "Notes",
      ],
      ...trip.days.flatMap((day) =>
        day.activities.map((activity) => [
          day.dayNumber,
          new Date(day.date).toISOString().slice(0, 10),
          activity.startTime || "",
          activity.title,
          activity.location || "",
          activity.durationMin || "",
          Number(activity.estimatedCost || 0),
          activity.notes || "",
        ]),
      ),
    ];
    download(
      `${safeName(trip.name)}.csv`,
      "text/csv;charset=utf-8",
      `\uFEFF${rows.map((row) => row.map(csvCell).join(",")).join("\r\n")}`,
    );
  }

  function exportCalendar() {
    const events = trip.days.flatMap((day) =>
      day.activities.map((activity) => {
        const start = calendarTime(day.date, activity.startTime || "09:00");
        const startDate = new Date(
          `${new Date(day.date).toISOString().slice(0, 10)}T${activity.startTime || "09:00"}:00`,
        );
        startDate.setMinutes(
          startDate.getMinutes() + Number(activity.durationMin || 60),
        );
        const end = `${startDate.getFullYear()}${String(startDate.getMonth() + 1).padStart(2, "0")}${String(startDate.getDate()).padStart(2, "0")}T${String(startDate.getHours()).padStart(2, "0")}${String(startDate.getMinutes()).padStart(2, "0")}00`;
        return [
          "BEGIN:VEVENT",
          `UID:${activity.id}@smarttrip-ph`,
          `DTSTART:${start}`,
          `DTEND:${end}`,
          `SUMMARY:${icsText(activity.title)}`,
          `LOCATION:${icsText(activity.location)}`,
          `DESCRIPTION:${icsText(activity.description || activity.notes)}`,
          "END:VEVENT",
        ].join("\r\n");
      }),
    );
    download(
      `${safeName(trip.name)}.ics`,
      "text/calendar;charset=utf-8",
      [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//SmartTrip PH//Itinerary//EN",
        ...events,
        "END:VCALENDAR",
      ].join("\r\n"),
    );
  }

  return (
    <details className="export-menu">
      <summary className="btn ghost">Export ▾</summary>
      <div>
        <button onClick={exportCalendar}>Calendar (.ics)</button>
        <button onClick={exportCsv}>Spreadsheet (.csv)</button>
        <button onClick={() => window.print()}>Print / Save PDF</button>
      </div>
    </details>
  );
}
