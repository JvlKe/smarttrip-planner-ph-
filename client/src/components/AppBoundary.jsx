import { Component } from "react";
import { reportClientError } from "../lib/api";

export default class AppBoundary extends Component {
  state = { error: null };
  static getDerivedStateFromError(error) {
    return { error };
  }
  componentDidCatch(error, details) {
    console.error("SmartTrip frontend error", error, details);
    reportClientError(error?.message || "React render error");
  }
  componentDidUpdate(previousProps) {
    if (this.state.error && previousProps.resetKey !== this.props.resetKey) {
      this.setState({ error: null });
    }
  }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <main className="fatal-error">
        <img src="/assets/lakbay-tarsier.webp" alt="Atlas" />
        <h1>Something went wrong</h1>
        <p>
          Your saved information is safe. Try the page again or return to the
          Dashboard.
        </p>
        <div>
          <button
            className="btn primary"
            onClick={() => this.setState({ error: null })}
          >
            Try again
          </button>
          <a className="btn outline" href="/app">
            Go to Dashboard
          </a>
        </div>
      </main>
    );
  }
}
