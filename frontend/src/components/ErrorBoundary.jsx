import { Component } from "react";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("React error boundary caught:", error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "2rem",
          fontFamily: "system-ui, sans-serif",
          background: "#0b1220",
          color: "#e5e7eb",
        }}>
          <div style={{ maxWidth: 640, width: "100%" }}>
            <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 12 }}>
              Hubo un error al cargar la página
            </h1>
            <p style={{ opacity: 0.7, marginBottom: 16 }}>
              Probá recargar. Si el problema persiste, copiá este mensaje:
            </p>
            <pre style={{
              background: "#111827",
              padding: 16,
              borderRadius: 8,
              overflow: "auto",
              fontSize: 12,
              border: "1px solid #1f2937",
            }}>
              {String(this.state.error?.stack || this.state.error?.message || this.state.error)}
            </pre>
            <button
              onClick={() => { this.setState({ error: null }); window.location.reload(); }}
              style={{
                marginTop: 16,
                padding: "10px 20px",
                background: "#0033cc",
                color: "white",
                border: "none",
                borderRadius: 8,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Recargar página
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
