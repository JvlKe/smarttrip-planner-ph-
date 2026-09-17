import { useEffect, useState } from "react";
import { api } from "../lib/api";

const tips = [
  "Keep screenshots and offline copies of important bookings before traveling.",
  "Carry small bills for jeepneys, tricycles, markets, and local entrance fees.",
  "Leave buffer time between activities—weather and traffic can change quickly.",
  "Bring water, sun protection, and a light rain layer for tropical weather.",
  "Verify fares, opening hours, and ferry schedules with official providers.",
  "Tell someone you trust about your route before hiking or island hopping.",
];

export default function LakbayAssistant() {
  const [open, setOpen] = useState(
    () => localStorage.getItem("smarttrip-atlas-open") === "true",
  );
  const [question, setQuestion] = useState("");
  const [busy, setBusy] = useState(false);
  const [tipIndex, setTipIndex] = useState(() =>
    Math.floor(Math.random() * tips.length),
  );
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      text: "Hi! I’m Atlas. Ask me how to use SmartTrip PH or for general Philippine travel tips.",
    },
  ]);
  useEffect(() => {
    const timer = setInterval(
      () => setTipIndex((value) => (value + 1) % tips.length),
      45000,
    );
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    localStorage.setItem("smarttrip-atlas-open", String(open));
  }, [open]);
  useEffect(() => {
    // Clear positions saved by older draggable versions of Atlas.
    localStorage.removeItem("smarttrip-atlas-position");
  }, []);
  async function ask(text = question) {
    const clean = typeof text === "string" ? text.trim() : "";
    if (!clean || busy) return;
    setQuestion("");
    setMessages((value) => [...value, { role: "user", text: clean }]);
    setBusy(true);
    try {
      const result = await api("/assistant/chat", {
        method: "POST",
        timeoutMs: 45000,
        body: JSON.stringify({ question: clean }),
      });
      const answer =
        typeof result?.answer === "string"
          ? result.answer.trim()
          : "I couldn’t format that answer. Please try another question.";
      setMessages((value) => [...value, { role: "assistant", text: answer }]);
    } catch (error) {
      setMessages((value) => [
        ...value,
        {
          role: "assistant",
          text:
            error.message ||
            "I couldn’t answer that right now. Please try again.",
        },
      ]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={`lakbay-widget ${open ? "open" : ""}`}>
      {open && (
        <section className="lakbay-chat" aria-label="Ask Atlas">
          <header>
            <div>
              <b>Ask Atlas</b>
              <small>SmartTrip guide · AI assisted</small>
            </div>
            <div className="atlas-window-actions">
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Minimize Atlas chat"
                title="Minimize"
              >
                −
              </button>
            </div>
          </header>
          <div className="lakbay-tip">
            <b>Travel tip</b>
            <span>{tips[tipIndex]}</span>
          </div>
          <div className="lakbay-messages" aria-live="polite">
            {messages.map((message, index) => (
              <p
                key={`${message.role}-${index}`}
                className={message.role === "user" ? "user" : "assistant"}
              >
                {typeof message.text === "string"
                  ? message.text
                  : "I couldn’t display that message."}
              </p>
            ))}
            {busy && <p className="assistant thinking">Atlas is thinking…</p>}
          </div>
          {messages.length === 1 && (
            <div className="lakbay-suggestions">
              <button onClick={() => ask("How do I create a trip?")}>
                Create a trip
              </button>
              <button onClick={() => ask("How does the budget estimate work?")}>
                Budget help
              </button>
              <button
                onClick={() => ask("Give me a useful travel safety tip.")}
              >
                Safety tip
              </button>
            </div>
          )}
          <form
            onSubmit={(event) => {
              event.preventDefault();
              ask();
            }}
          >
            <input
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              maxLength="500"
              placeholder="Ask about SmartTrip or travel…"
              aria-label="Question for Atlas"
            />
            <button
              disabled={busy || !question.trim()}
              aria-label="Send question"
            >
              ➤
            </button>
          </form>
          <small className="lakbay-disclaimer">
            Don’t share passwords, payment details, or personal information.
          </small>
        </section>
      )}
      <button
        className="lakbay-launcher"
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-label={open ? "Close Atlas assistant" : "Ask Atlas a question"}
        title={open ? "Close Atlas" : "Ask Atlas"}
      >
        {!open && <span>Ask Atlas</span>}
        <img src="/assets/lakbay-tarsier.webp" alt="" />
      </button>
    </div>
  );
}
