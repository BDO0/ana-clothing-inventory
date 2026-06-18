// ErrorBoundary — catches rendering errors and shows a fallback UI
// Prevents the entire app from going blank on unhandled errors
import { Component, type ErrorInfo, type ReactNode } from "react";
import { colors, fontSize } from "../tokens";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error("[ErrorBoundary] Caught error:", error, errorInfo);
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "60vh",
            padding: 40,
            textAlign: "center",
          }}
        >
          <div
            style={{
              fontSize: 48,
              marginBottom: 16,
              lineHeight: 1,
            }}
          >
            ⚠️
          </div>
          <h2
            style={{
              margin: "0 0 8px",
              fontSize: fontSize.lg,
              fontWeight: 600,
              color: colors.text,
            }}
          >
            Something went wrong
          </h2>
          <p
            style={{
              margin: "0 0 24px",
              fontSize: 13,
              color: colors.muted,
              maxWidth: 400,
            }}
          >
            An unexpected error occurred. You can try reloading the page or
            clearing your browser data if the problem persists.
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: "10px 24px",
              background: colors.accent,
              color: "#fff",
              border: "none",
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Reload Page
          </button>
          {this.state.error && (
            <details
              style={{
                marginTop: 24,
                fontSize: 12,
                color: colors.muted,
                textAlign: "left",
                maxWidth: 500,
              }}
            >
              <summary style={{ cursor: "pointer" }}>Error details</summary>
              <pre
                style={{
                  marginTop: 8,
                  padding: 12,
                  background: "rgba(0,0,0,0.03)",
                  borderRadius: 6,
                  overflowX: "auto",
                  fontSize: 11,
                  lineHeight: 1.5,
                }}
              >
                {this.state.error.message}
                {"\n\n"}
                {this.state.error.stack}
              </pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}