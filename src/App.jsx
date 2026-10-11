import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import RequireAuth from "./auth/RequireAuth";
import AppLayout from "./layout/AppLayout";

const AccessMessagePage = lazy(() => import("./pages/AccessMessagePage"));
const AdministrativeDocumentPage = lazy(() => import('./pages/AdministrativeDocumentPage'));
const LoginPage = lazy(() => import("./pages/LoginPage"));
const HomePage = lazy(() => import("./pages/HomePage"));
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
const DocumentsAdminPage = lazy(() => import("./pages/DocumentsAdminPage"));
const SuperAdminsPage = lazy(() => import("./pages/SuperAdminsPage"));
const LinkFormsPage = lazy(() => import("./pages/LinkFormsPage"));
const PublicLinkFormPage = lazy(() => import("./pages/PublicLinkFormPage"));
const PublicActionPage = lazy(() => import("./pages/PublicActionPage"));
const VolunteerAttendancePage = lazy(() => import("./pages/VolunteerAttendancePage"));

export default function App() {
  return (
    <Suspense fallback={<main style={{ padding: "2rem", textAlign: "center" }}>Carregando...</main>}>
      <Routes>
      <Route path="formularios/:token" element={<PublicLinkFormPage />} />
      <Route path="participar/:actionId" element={<PublicActionPage />} />
      <Route element={<AppLayout />}>
        <Route index element={<HomePage />} />
        <Route path="2025" element={<Navigate to="/#edicao-2025" replace />} />
        <Route path="2025/relatorio" element={<ReportViewerPage />} />
        <Route path="2026" element={<Navigate to="/#acoes-2026" replace />} />
        <Route path="agenda-2030" element={<Navigate to="/#agenda-2030" replace />} />
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
          <Route path="admin/documentos" element={<DocumentsAdminPage />} />
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
          <Route path="coordenacao/documento" element={<AdministrativeDocumentPage />} />
          <Route path="presencas" element={<AttendancePage />} />
        </Route>

        <Route element={<RequireAuth allowedRoles={["volunteer"]} />}>
          <Route path="voluntario" element={<VolunteerAreaPage />} />
          <Route path="presenca/:actionId" element={<VolunteerAttendancePage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
      </Routes>
    </Suspense>
  );
}
