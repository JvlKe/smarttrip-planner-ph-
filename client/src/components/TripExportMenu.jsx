import { safeName, tripCsv, tripCalendar } from "../lib/tripExports.js";
import { saveDownload } from "../lib/tripView.js";

export default function TripExportMenu({ trip }) {
  return (
    <details className="export-menu">
      <summary className="btn ghost">Export ▾</summary>
      <div>
        <button onClick={() => saveDownload(tripCalendar(trip), `${safeName(trip.name)}.ics`, "text/calendar;charset=utf-8")}>Calendar (.ics)</button>
        <button onClick={() => saveDownload(tripCsv(trip), `${safeName(trip.name)}.csv`, "text/csv;charset=utf-8")}>Spreadsheet (.csv)</button>
        <button onClick={() => window.print()}>Print / Save PDF</button>
      </div>
    </details>
  );
}
