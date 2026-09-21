import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";

const APP_VERSION = import.meta.env.VITE_APP_VERSION || "dev";

const storedVersion = localStorage.getItem("app_version");

if (storedVersion !== APP_VERSION) {
  console.log(`Version change detected: ${storedVersion} -> ${APP_VERSION}`);

  localStorage.setItem("app_version", APP_VERSION);

  sessionStorage.clear();

  window.location.reload();
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);