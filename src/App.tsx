import { useLayoutEffect } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { DataProvider } from "./context/DataContext";
import { PublicLayout } from "./components/PublicLayout";
import { RequireAuth } from "./components/RequireAuth";
import { AppShell } from "./layouts/AppShell";
import { HomePage } from "./pages/HomePage";
import { FaqPage } from "./pages/FaqPage";
import { InstallationClassiquePage } from "./pages/InstallationClassiquePage";
import { ConnexionPage } from "./pages/ConnexionPage";
import { AppHomeEntry } from "./pages/dashboard/AppHomeEntry";
import { DocsPage } from "./pages/dashboard/DocsPage";
import { TechTeamPage } from "./pages/dashboard/TechTeamPage";
import { TechnicianDetailPage } from "./pages/dashboard/TechnicianDetailPage";
import { FleetVehiclesPage } from "./pages/dashboard/FleetVehiclesPage";
import { PlanningPage } from "./pages/dashboard/PlanningPage";
import { ClientsPage } from "./pages/dashboard/ClientsPage";
import { CommerciauxListPage } from "./pages/dashboard/CommerciauxListPage";
import { CommercialAdminDetailPage } from "./pages/dashboard/CommercialAdminDetailPage";
import { CommercialMonthlyStatementPage } from "./pages/dashboard/CommercialMonthlyStatementPage";
import { UsersPage } from "./pages/dashboard/UsersPage";
import { TechVentesPage } from "./pages/dashboard/TechVentesPage";
import { DocsTechniquePage } from "./pages/dashboard/DocsTechniquePage";
import { SiteSurveyTechPage } from "./pages/dashboard/SiteSurveyTechPage";
import { SiteSurveyPlanningPage } from "./pages/dashboard/SiteSurveyPlanningPage";
import { ClientDossierPage } from "./pages/dashboard/ClientDossierPage";
import { MaterialCatalogPage } from "./pages/dashboard/MaterialCatalogPage";
import { TechStockPage } from "./pages/dashboard/TechStockPage";
import { InstallerStockAdminPage } from "./pages/dashboard/InstallerStockAdminPage";
import { AdminDashboard } from "./pages/dashboard/AdminDashboard";
import { CommercialRoiSimulatorPage } from "./pages/dashboard/CommercialRoiSimulatorPage";
import { PublicDevisSignerPage } from "./pages/PublicDevisSignerPage";
import { PublicConditionsPage } from "./pages/PublicConditionsPage";
import { SeoLandingRoute } from "./pages/SeoLandingRoute";

function ScrollToTopOnReload() {
  useLayoutEffect(() => {
    const [nav] = performance.getEntriesByType("navigation") as PerformanceNavigationTiming[];
    // Ne pas écraser une URL du type /#offre au rechargement — HomePage fera le scroll vers la section.
    if (nav?.type === "reload" && !window.location.hash) {
      window.scrollTo(0, 0);
    }
  }, []);
  return null;
}

export default function App() {
  return (
    <AuthProvider>
      <DataProvider>
        <BrowserRouter>
          <ScrollToTopOnReload />
          <Routes>
            <Route element={<PublicLayout />}>
              <Route index element={<HomePage />} />
              <Route path="installation-classique" element={<InstallationClassiquePage />} />
              <Route path="faq" element={<FaqPage />} />
              <Route path="solutions/:slug" element={<SeoLandingRoute />} />
              <Route path="connexion" element={<ConnexionPage />} />
            </Route>

            <Route path="/devis-signer/:token" element={<PublicDevisSignerPage />} />
            <Route path="/conditions-generales" element={<PublicConditionsPage />} />

            <Route
              path="/app"
              element={
                <RequireAuth>
                  <AppShell />
                </RequireAuth>
              }
            >
              <Route index element={<AppHomeEntry />} />
              <Route
                path="admin"
                element={
                  <RequireAuth roles={["admin"]}>
                    <AdminDashboard />
                  </RequireAuth>
                }
              />
              <Route
                path="tech"
                element={
                  <RequireAuth roles={["admin", "dispatch"]}>
                    <TechTeamPage />
                  </RequireAuth>
                }
              />
              <Route
                path="tech/:installerId"
                element={
                  <RequireAuth roles={["admin", "dispatch"]}>
                    <TechnicianDetailPage />
                  </RequireAuth>
                }
              />
              <Route
                path="flotte-vehicules"
                element={
                  <RequireAuth roles={["admin", "dispatch"]}>
                    <FleetVehiclesPage />
                  </RequireAuth>
                }
              />
              <Route
                path="planning"
                element={
                  <RequireAuth roles={["admin", "dispatch", "installateur"]}>
                    <PlanningPage />
                  </RequireAuth>
                }
              />
              <Route
                path="clients"
                element={
                  <RequireAuth roles={["admin", "dispatch", "site_survey", "installateur"]}>
                    <ClientsPage />
                  </RequireAuth>
                }
              />
              <Route
                path="dossier/:leadId"
                element={
                  <RequireAuth roles={["admin", "dispatch", "site_survey", "installateur"]}>
                    <ClientDossierPage />
                  </RequireAuth>
                }
              />
              <Route
                path="commerciaux"
                element={
                  <RequireAuth roles={["admin"]}>
                    <CommerciauxListPage />
                  </RequireAuth>
                }
              />
              <Route
                path="commerciaux/:commercialId"
                element={
                  <RequireAuth roles={["admin"]}>
                    <CommercialAdminDetailPage />
                  </RequireAuth>
                }
              />
              <Route
                path="commerciaux/:commercialId/fiche-mensuelle"
                element={
                  <RequireAuth roles={["admin"]}>
                    <CommercialMonthlyStatementPage />
                  </RequireAuth>
                }
              />
              <Route
                path="utilisateurs"
                element={
                  <RequireAuth roles={["admin"]}>
                    <UsersPage />
                  </RequireAuth>
                }
              />
              <Route
                path="ventes"
                element={
                  <RequireAuth roles={["installateur"]}>
                    <TechVentesPage />
                  </RequireAuth>
                }
              />
              <Route
                path="docs-technique"
                element={
                  <RequireAuth roles={["installateur"]}>
                    <DocsTechniquePage />
                  </RequireAuth>
                }
              />
              <Route
                path="site-survey"
                element={
                  <RequireAuth roles={["installateur", "site_survey", "admin"]}>
                    <SiteSurveyTechPage />
                  </RequireAuth>
                }
              />
              <Route
                path="planning-site-survey"
                element={
                  <RequireAuth roles={["admin", "site_survey"]}>
                    <SiteSurveyPlanningPage />
                  </RequireAuth>
                }
              />
              <Route
                path="simulateur-roi"
                element={
                  <RequireAuth roles={["commercial"]}>
                    <CommercialRoiSimulatorPage />
                  </RequireAuth>
                }
              />
              <Route
                path="docs"
                element={
                  <RequireAuth roles={["admin", "dispatch", "site_survey", "commercial", "installateur"]}>
                    <DocsPage />
                  </RequireAuth>
                }
              />
              <Route
                path="catalogue-materiaux"
                element={
                  <RequireAuth roles={["admin", "dispatch"]}>
                    <MaterialCatalogPage />
                  </RequireAuth>
                }
              />
              <Route
                path="stock"
                element={
                  <RequireAuth roles={["installateur"]}>
                    <TechStockPage />
                  </RequireAuth>
                }
              />
              <Route
                path="stock-techniciens"
                element={
                  <RequireAuth roles={["admin", "dispatch"]}>
                    <InstallerStockAdminPage />
                  </RequireAuth>
                }
              />
              <Route path="timeline" element={<Navigate to="/app/planning#timeline-planning" replace />} />
              <Route path="dispatch" element={<Navigate to="/app/planning#pool-dispatch" replace />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </DataProvider>
    </AuthProvider>
  );
}
