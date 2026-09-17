import { useEffect, useState } from "react";

const GENERATION_MESSAGES = [
  "Building your day-by-day itinerary",
  "Balancing activities and travel time",
  "Checking places and route flow",
  "Finalizing budget estimates and travel notes",
];

export default function TripGenerationScreen({ stage, tripName, destination }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const startedAt = Date.now();
    const timer = window.setInterval(
      () => setElapsed(Math.floor((Date.now() - startedAt) / 1000)),
      1000,
    );
    return () => window.clearInterval(timer);
  }, []);

  const isSaving = stage === "saving";
  const isFinishing = stage === "finishing";
  const rotatingMessage =
    GENERATION_MESSAGES[
      Math.min(
        GENERATION_MESSAGES.length - 1,
        Math.floor(Math.max(0, elapsed - 3) / 9),
      )
    ];
  const title = isSaving
    ? "Saving your trip details"
    : isFinishing
      ? "Your itinerary is almost ready"
      : rotatingMessage;

  return (
    <div
      className="trip-generation-screen"
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={title}
    >
      <section className="trip-generation-card">
        <p className="generation-eyebrow">Building your SmartTrip</p>
        <div className="generation-route" aria-hidden="true">
          <span className="generation-route-line" />
          <span className="generation-route-dot start" />
          <span className="generation-plane">✈</span>
          <span className="generation-route-dot finish" />
        </div>
        <h1>{title}<span className="generation-dots" aria-hidden="true">…</span></h1>
        <p className="generation-trip-name">
          {tripName || "Your new trip"}
          {destination ? ` · ${destination}` : ""}
        </p>
        <div className="generation-progress" aria-hidden="true">
          <span />
        </div>
        <ol className="generation-steps" aria-label="Generation progress">
          <li className={isSaving ? "active" : "done"}>
            <span>{isSaving ? "1" : "✓"}</span> Save trip details
          </li>
          <li className={!isSaving && !isFinishing ? "active" : isFinishing ? "done" : ""}>
            <span>{isFinishing ? "✓" : "2"}</span> Create itinerary
          </li>
          <li className={isFinishing ? "active" : ""}>
            <span>3</span> Open your plan
          </li>
        </ol>
        <p className="generation-reassurance">
          {isSaving
            ? "Keep this tab open while we safely save your trip."
            : "Your trip details are saved. AI planning can take about a minute, so please keep this tab open."}
        </p>
        <small>{elapsed < 5 ? "Getting everything ready" : `${elapsed} seconds elapsed`}</small>
      </section>
    </div>
  );
}
