import { Navigate, Route, Routes } from "react-router-dom";
import RequireAuth from "./auth/RequireAuth";
import AppLayout from "./layout/AppLayout";
import AccessMessagePage from "./pages/AccessMessagePage";
import BranchesPage from "./pages/BranchesPage";
import BranchViewersPage from "./pages/BranchViewersPage";
import ConsultationPage from "./pages/ConsultationPage";
import DashboardPage from "./pages/DashboardPage";
import LoginPage from "./pages/LoginPage";
import PublicHome from "./pages/PublicHome";
import VolunteersPage from "./pages/VolunteersPage";
import ActionsPage from "./pages/ActionsPage";
import CampaignGateway from "./pages/CampaignGateway";
import Campaign2025Page from "./pages/Campaign2025Page";
import Campaign2026Page from "./pages/Campaign2026Page";
import AssociatesCounterPage from "./pages/AssociatesCounterPage";
import ReportsAdminPage from "./pages/ReportsAdminPage";
import ReportViewerPage from "./pages/ReportViewerPage";

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<CampaignGateway />} />
        <Route path="2025" element={<Campaign2025Page />} />
        <Route path="2025/relatorio" element={<ReportViewerPage />} />
        <Route path="2026" element={<Campaign2026Page />} />
        {import.meta.env.DEV && <Route path="2026/desenvolvimento" element={<PublicHome />} />}
        <Route path="login" element={<LoginPage />} />
        <Route path="acesso-bloqueado" element={<AccessMessagePage blocked />} />
        <Route path="sem-permissao" element={<AccessMessagePage />} />

        <Route element={<RequireAuth allowedRoles={["superAdmin"]} />}>
          <Route path="admin" element={<DashboardPage area="admin" />} />
          <Route path="admin/voluntarios" element={<VolunteersPage />} />
          <Route path="admin/acoes" element={<ActionsPage />} />
          <Route path="admin/contador-associados" element={<AssociatesCounterPage />} />
          <Route path="admin/relatorio-2025" element={<ReportsAdminPage />} />
        </Route>

        <Route element={<RequireAuth allowedRoles={["superAdmin"]} />}>
          <Route path="admin/filiais" element={<BranchesPage />} />
          <Route path="admin/acessos-consulta" element={<BranchViewersPage />} />
        </Route>

        <Route element={<RequireAuth allowedRoles={["branchViewer"]} />}>
          <Route path="consulta" element={<ConsultationPage />} />
        </Route>

        <Route element={<RequireAuth allowedRoles={["volunteer"]} />}>
          <Route path="voluntario" element={<DashboardPage area="volunteer" />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
