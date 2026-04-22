import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { DataProvider } from "./context/DataContext";
import { PublicLayout } from "./components/PublicLayout";
import { RequireAuth } from "./components/RequireAuth";
import { AppShell } from "./layouts/AppShell";
import { HomePage } from "./pages/HomePage";
import { FaqPage } from "./pages/FaqPage";
import { ConnexionPage } from "./pages/ConnexionPage";
import { RoleDashboard } from "./pages/dashboard/RoleDashboard";
import { DocsPage } from "./pages/dashboard/DocsPage";
import { DispatchTimelinePage } from "./pages/dashboard/DispatchTimelinePage";
import { DispatchDashboard } from "./pages/dashboard/DispatchDashboard";

export default function App() {
  return (
    <AuthProvider>
      <DataProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<PublicLayout />}>
              <Route index element={<HomePage />} />
              <Route path="faq" element={<FaqPage />} />
              <Route path="connexion" element={<ConnexionPage />} />
            </Route>

            <Route
              path="/app"
              element={
                <RequireAuth>
                  <AppShell />
                </RequireAuth>
              }
            >
              <Route index element={<RoleDashboard />} />
              <Route
                path="docs"
                element={
                  <RequireAuth roles={["commercial"]}>
                    <DocsPage />
                  </RequireAuth>
                }
              />
              <Route
                path="timeline"
                element={
                  <RequireAuth roles={["dispatch", "admin"]}>
                    <DispatchTimelinePage />
                  </RequireAuth>
                }
              />
              <Route
                path="dispatch"
                element={
                  <RequireAuth roles={["admin"]}>
                    <DispatchDashboard />
                  </RequireAuth>
                }
              />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </DataProvider>
    </AuthProvider>
  );
}
