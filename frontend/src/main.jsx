import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import ErrorBoundary from "./components/ErrorBoundary.jsx";
import { CartProvider } from "./Context/CartContext.jsx";
import { AuthProvider } from "./Context/AuthContext.jsx";
import { ConfirmProvider } from "./Context/ConfirmContext.jsx";
import { Toaster } from "react-hot-toast";
import { HelmetProvider } from "react-helmet-async";
import { recargarPorDeploy } from "./utils/recargaPorDeploy.js";

// Vite avisa cuando no puede bajar una parte de la página (pasa después de cada
// deploy, ver recargaPorDeploy.js). Si recarga, se cancela el error.
window.addEventListener("vite:preloadError", (event) => {
  if (recargarPorDeploy()) event.preventDefault();
});

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <ErrorBoundary>
      <HelmetProvider>
        <AuthProvider>
          <CartProvider>
            <ConfirmProvider>
              <App />
            </ConfirmProvider>
          </CartProvider>
        </AuthProvider>
        <Toaster position="top-right" />
      </HelmetProvider>
    </ErrorBoundary>
  </StrictMode>
);
