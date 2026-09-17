import { Component } from "react";
import LakbayAssistant from "./LakbayAssistant";

export default class AtlasBoundary extends Component {
  state = { failed: false, error: "" };
  static getDerivedStateFromError(error) {
    return {
      failed: true,
      error: error?.message || "Atlas encountered a display problem.",
    };
  }
  componentDidCatch(error) {
    console.error("Atlas widget error", error);
  }
  render() {
    if (this.state.failed)
      return (
        <div className="atlas-recovery">
          <b>Atlas needs to restart</b>
          <small>{this.state.error}</small>
          <button onClick={() => this.setState({ failed: false, error: "" })}>
            Restart Atlas
          </button>
        </div>
      );
    return <LakbayAssistant />;
  }
}
