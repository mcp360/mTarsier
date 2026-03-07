import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

// Initialize theme store early so CSS vars are set before first paint
import "./store/themeStore";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
