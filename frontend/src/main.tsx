import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, HashRouter } from "react-router-dom";
import { App } from "./App";
import { ErrorBoundary } from "./components/ui/ErrorBoundary";
import "./styles/globals.css";

const Router =
  import.meta.env.VITE_ROUTER_MODE === "hash" ? HashRouter : BrowserRouter;
const routerFuture = {
  v7_relativeSplatPath: true,
  v7_startTransition: true,
};

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      <Router future={routerFuture}>
        <App />
      </Router>
    </ErrorBoundary>
  </StrictMode>,
);
