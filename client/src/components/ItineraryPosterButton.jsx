const peso = (n) =>
  `₱${Number(n).toLocaleString("en-PH", { maximumFractionDigits: 0 })}`;
export default function ItineraryPosterButton({ trip }) {
  function download() {
    const activities = trip.days.reduce((n, d) => n + d.activities.length, 0),
      canvas = document.createElement("canvas"),
      w = 1200,
      h = Math.max(900, 430 + activities * 78 + trip.days.length * 62);
    canvas.width = w;
    canvas.height = h;
    const c = canvas.getContext("2d");
    c.fillStyle = "#f7f1e5";
    c.fillRect(0, 0, w, h);
    c.fillStyle = "#073b35";
    c.fillRect(0, 0, w, 270);
    c.fillStyle = "#fff";
    c.font = "bold 28px sans-serif";
    c.fillText("SMARTTRIP PLANNER PH", 60, 65);
    c.font = "bold 64px sans-serif";
    c.fillText(
      (trip.destination?.name || trip.customLocation).toUpperCase(),
      60,
      145,
    );
    c.font = "28px sans-serif";
    c.fillText(
      `${new Date(trip.startDate).toLocaleDateString()} – ${new Date(trip.endDate).toLocaleDateString()}  •  ${trip.travelers} traveler(s)`,
      60,
      200,
    );
    c.fillStyle = "#f4bd36";
    c.font = "bold 30px sans-serif";
    c.fillText(`${peso(trip.totalBudget)} ESTIMATED BUDGET`, 60, 245);
    let y = 330;
    for (const d of trip.days) {
      c.fillStyle = "#0f766e";
      c.font = "bold 26px sans-serif";
      c.fillText(`DAY ${d.dayNumber} — ${d.title}`, 60, y);
      y += 42;
      for (const a of d.activities) {
        c.fillStyle = "#17262b";
        c.font = "bold 21px sans-serif";
        c.fillText(`${a.startTime || "Any time"}   ${a.title}`, 90, y);
        c.fillStyle = "#68777c";
        c.font = "17px sans-serif";
        c.fillText(
          `${a.location || "Location flexible"}  •  ${peso(a.estimatedCost)}`,
          90,
          y + 25,
        );
        y += 70;
      }
      y += 20;
    }
    c.fillStyle = "#073b35";
    c.fillRect(0, h - 125, w, 125);
    c.fillStyle = "#fff";
    c.font = "bold 23px sans-serif";
    c.fillText(
      `TRANSPORT: ${trip.transportMode === "PRIVATE_VEHICLE" ? "PRIVATE VEHICLE (FUEL, TOLLS & PARKING)" : "PUBLIC TRANSPORT"}`,
      60,
      h - 75,
    );
    c.font = "17px sans-serif";
    c.fillText(
      "Planning estimate only. Actual schedules and costs may vary.",
      60,
      h - 40,
    );
    const link = document.createElement("a");
    link.download = `${trip.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-itinerary.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  }
  return (
    <button className="btn primary" onClick={download}>
      ▣ Download itinerary image
    </button>
  );
}
