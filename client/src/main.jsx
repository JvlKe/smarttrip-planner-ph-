import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { AuthProvider } from "./context/AuthContext";
import "./style.css";
import "./tactile.css";
import "./fresh.css";
document.documentElement.dataset.theme =
  localStorage.getItem("theme") || "light";

createRoot(document.getElementById("app")).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
