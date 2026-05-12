import type { ReactNode } from "react";
import React from "react";

type Props = {
  children: ReactNode;
};

type State = {
  hasError: boolean;
};

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch() {}

  private handleReset = () => {
    this.setState({ hasError: false });
    window.location.assign("/");
  };

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div style={{ minHeight: "60vh", display: "grid", placeItems: "center", padding: 24 }}>
        <div style={{ maxWidth: 560 }}>
          <div style={{ fontSize: 13, opacity: 0.75 }}>WongBanter Capital</div>
          <h1 style={{ margin: "10px 0 10px", letterSpacing: "-0.03em" }}>Something went wrong</h1>
          <p style={{ margin: 0, opacity: 0.8, lineHeight: 1.6 }}>
            Please refresh the page. If the issue persists, try again in a moment.
          </p>
          <div style={{ marginTop: 16 }}>
            <button
              type="button"
              onClick={this.handleReset}
              style={{
                borderRadius: 12,
                padding: "10px 14px",
                border: "1px solid rgba(255,255,255,.16)",
                background: "rgba(255,255,255,.06)",
                color: "rgba(255,255,255,.92)",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Back to Home
            </button>
          </div>
        </div>
      </div>
    );
  }
}

