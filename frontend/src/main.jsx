import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@/index.css";

import { RouterProvider } from "react-router";
import router from "@/AppRoutes";
import { LanguageProvider } from "@/i18n/LanguageContext.jsx";
import { AuthProvider } from "@/context/AuthContext.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <LanguageProvider>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </LanguageProvider>
  </StrictMode>,
);