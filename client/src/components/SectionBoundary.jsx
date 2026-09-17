import { Component } from "react";

export default class SectionBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error, details) {
    console.error(`${this.props.name || "Section"} error`, error, details);
  }
  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <section className="section-failure">
        <b>
          {this.props.message || "This section is temporarily unavailable."}
        </b>
        <p>The rest of your trip is still available.</p>
        <button onClick={() => this.setState({ failed: false })}>
          Try again
        </button>
      </section>
    );
  }
}
