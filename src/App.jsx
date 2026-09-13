import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import RequireAuth from "./auth/RequireAuth";
import AppLayout from "./layout/AppLayout";
import AccessMessagePage from "./pages/AccessMessagePage";
import LoginPage from "./pages/LoginPage";
import CampaignGateway from "./pages/CampaignGateway";
import Campaign2025Page from "./pages/Campaign2025Page";

const PublicHome = lazy(() => import("./pages/PublicHome"));
const ReportViewerPage = lazy(() => import("./pages/ReportViewerPage"));
const BranchesPage = lazy(() => import("./pages/BranchesPage"));
const BranchViewersPage = lazy(() => import("./pages/BranchViewersPage"));
const ConsultationPage = lazy(() => import("./pages/ConsultationPage"));
const DashboardPage = lazy(() => import("./pages/DashboardPage"));
const VolunteersPage = lazy(() => import("./pages/VolunteersPage"));
const ActionsPage = lazy(() => import("./pages/ActionsPage"));
const AttendancePage = lazy(() => import("./pages/AttendancePage"));
const VolunteerAreaPage = lazy(() => import("./pages/VolunteerAreaPage"));
const AssociatesCounterPage = lazy(() => import("./pages/AssociatesCounterPage"));
const ReportsAdminPage = lazy(() => import("./pages/ReportsAdminPage"));
const SuperAdminsPage = lazy(() => import("./pages/SuperAdminsPage"));
const LinkFormsPage = lazy(() => import("./pages/LinkFormsPage"));
const PublicLinkFormPage = lazy(() => import("./pages/PublicLinkFormPage"));

export default function App() {
  return (
    <Suspense fallback={<main style={{ padding: "2rem", textAlign: "center" }}>Carregando...</main>}>
      <Routes>
      <Route path="formularios/:token" element={<PublicLinkFormPage />} />
      <Route element={<AppLayout />}>
        <Route index element={<CampaignGateway />} />
        <Route path="2025" element={<Campaign2025Page />} />
        <Route path="2025/relatorio" element={<ReportViewerPage />} />
        <Route path="2026" element={<PublicHome />} />
        {import.meta.env.DEV && <Route path="2026/desenvolvimento" element={<PublicHome />} />}
        <Route path="login" element={<LoginPage />} />
        <Route path="admin/login" element={<LoginPage />} />
        <Route path="admin/acesso-bloqueado" element={<AccessMessagePage blocked />} />
        <Route path="admin/sem-permissao" element={<AccessMessagePage />} />
        <Route path="acesso-bloqueado" element={<AccessMessagePage blocked />} />
        <Route path="sem-permissao" element={<AccessMessagePage />} />

        <Route element={<RequireAuth allowedRoles={["superAdmin"]} />}>
          <Route path="admin" element={<DashboardPage area="admin" />} />
          <Route path="admin/formularios" element={<LinkFormsPage />} />
          <Route path="admin/voluntarios" element={<VolunteersPage />} />
          <Route path="admin/acoes" element={<ActionsPage />} />
          <Route path="admin/presencas" element={<AttendancePage />} />
          <Route path="admin/contador-associados" element={<AssociatesCounterPage />} />
          <Route path="admin/relatorio-2025" element={<ReportsAdminPage />} />
          <Route path="admin/superadmins" element={<SuperAdminsPage />} />
        </Route>

        <Route element={<RequireAuth allowedRoles={["superAdmin"]} />}>
          <Route path="admin/regionais" element={<BranchesPage />} />
          <Route path="admin/filiais" element={<Navigate to="/admin/regionais" replace />} />
          <Route path="admin/acessos-consulta" element={<BranchViewersPage />} />
        </Route>

        <Route element={<RequireAuth allowedRoles={["branchViewer"]} />}>
          <Route path="consulta" element={<ConsultationPage />} />
        </Route>
        <Route element={<RequireAuth allowedRoles={["superAdmin", "branchViewer"]} />}>
          <Route path="presencas" element={<AttendancePage />} />
        </Route>

        <Route element={<RequireAuth allowedRoles={["volunteer"]} />}>
          <Route path="voluntario" element={<VolunteerAreaPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
      </Routes>
    </Suspense>
  );
}
