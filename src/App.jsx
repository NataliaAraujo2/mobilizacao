// src/App.jsx
import { Routes, Route } from "react-router-dom";

import Footer from "./components/Footer";

import Home from "./pages/Home";
import Partners from "./pages/Partners";
import VolunteerForm from "./components/VolunteerForm.jsx";

import Login from "./pages/Login";
import Unauthorized from "./pages/Unauthorized";
import PrivateRoute from "./components/PrivateRoute.jsx";

import RestrictedArea from "./pages/RestrictedArea.jsx";

// Dashboards
import DashboardRouter from "./pages/Admin/Dashboard/DashboardRouter.jsx";
import NationalDashboard from "./pages/Admin/Dashboard/NationalDashboard.jsx";
import StateDashboard from "./pages/Admin/Dashboard/StateDashboard.jsx";
import MunicipalDashboard from "./pages/Admin/Dashboard/MunicipalDashboard.jsx";
import PartnerDashboard from "./pages/Admin/Dashboard/PartnerDashboard.jsx";
import VolunteerDashboard from "./pages/Admin/Dashboard/VolunteerDashboard.jsx";

// Aprovações
import PartnersApproval from "./pages/Admin/Partners/PartnersApproval.jsx";
import VolunteersApproval from "./pages/Admin/Volunteers/VolunteersApproval.jsx";
import CoordinatorsDashboard from "./pages/Admin/Dashboard/CoordinatorsDashboard.jsx";
import VolunteersDashboard from "./pages/Admin/Dashboard/VolunteersDashboard.jsx";
import PartnersDashboard from "./pages/Admin/Dashboard/PartnersDashboard.jsx";
import PartnerEdit from "./pages/Admin/Partners/PartnerEdit.jsx";
import PartnerCreate from "./pages/Admin/Partners/PartnerCreate.jsx";
import PartnerForm from "./components/PartnerForm.jsx";
import PartnerList from "./pages/Admin/Partners/PartnerList.jsx";
import PublicRoute from "./components/PublicRoute.jsx";
import Actions from "./pages/Actions.jsx";
import Volunteers from "./pages/Volunteers.jsx";
import { CoordinationsPage } from "./pages/Admin/Coordinations/CoordinationsPage.jsx";
import { ProjectsPage } from "./pages/Admin/Projects/ProjectsPage.jsx";

function App() {
  return (
    <>
      <main style={{ padding: "1rem" }}>
        <Routes>
          {/* Público */}
          <Route
            path="/"
            element={
              <PublicRoute>
                <Home />
              </PublicRoute>
            }
          />

          {/*Voluntários*/}
          <Route path="/voluntarios" element={<Volunteers />} />
          <Route path="/voluntarios/cadastro" element={<VolunteerForm />} />

          {/*Parceiros*/}
          <Route path="/parceiros" element={<Partners />} />
          <Route path="/parceiros/cadastro" element={<PartnerForm />} />
          {/*Projetos*/}
          <Route path="/acoes" element={<Actions />} />

          <Route path="/login" element={<Login />} />
          <Route path="/unauthorized" element={<Unauthorized />} />
          <Route path="/area-restrita" element={<RestrictedArea />} />

          {/* Área restrita → roteador principal */}
          <Route
            path="/dashboard/*"
            element={
              <PrivateRoute
                requiredPermissions={[
                  "dashboard_nacional",
                  "dashboard_estadual",
                  "dashboard_municipal",
                  "dashboard_parceiro",
                  "consultas_basicas",
                ]}
              >
                <DashboardRouter />
              </PrivateRoute>
            }
          />

          {/* Dashboards individuais */}
          <Route
            path="/dashboard/nacional"
            element={
              <PrivateRoute requiredPermissions={["dashboard_nacional"]}>
                <NationalDashboard />
              </PrivateRoute>
            }
          />
          <Route
            path="/dashboard/estadual"
            element={
              <PrivateRoute requiredPermissions={["dashboard_estadual"]}>
                <StateDashboard />
              </PrivateRoute>
            }
          />
          <Route
            path="/dashboard/municipal"
            element={
              <PrivateRoute requiredPermissions={["dashboard_municipal"]}>
                <MunicipalDashboard />
              </PrivateRoute>
            }
          />
          <Route
            path="/dashboard/parceiro"
            element={
              <PrivateRoute requiredPermissions={["dashboard_parceiro"]}>
                <PartnerDashboard />
              </PrivateRoute>
            }
          />
          <Route
            path="/dashboard/voluntario"
            element={
              <PrivateRoute requiredPermissions={["consultas_basicas"]}>
                <VolunteerDashboard />
              </PrivateRoute>
            }
          />

          {/* Dashboards principais de gestão */}
          {/* Parceiros */}
          <Route
            path="/dashboard/parceiros"
            element={
              <PrivateRoute
                requiredPermissions={[
                  "partners_view_nacional",
                  "partners_view_estadual",
                  "partners_view_municipal",
                ]}
              >
                <PartnersDashboard />
              </PrivateRoute>
            }
          />

          <Route
            path="/dashboard/parceiros/create"
            element={
              <PrivateRoute
                requiredPermissions={[
                  "partners_view_nacional",
                  "partners_view_estadual",
                  "partners_view_municipal",
                ]}
              >
                <PartnerCreate />
              </PrivateRoute>
            }
          />

          <Route
            path="/dashboard/parceiros/list"
            element={
              <PrivateRoute
                requiredPermissions={[
                  "partners_view_nacional",
                  "partners_view_estadual",
                  "partners_view_municipal",
                ]}
              >
                <PartnerList />
              </PrivateRoute>
            }
          />

          <Route
            path="/dashboard/parceiros/edit/:id"
            element={
              <PrivateRoute
                requiredPermissions={[
                  "partners_view_nacional",
                  "partners_view_estadual",
                  "partners_view_municipal",
                ]}
              >
                <PartnerEdit />
              </PrivateRoute>
            }
          />

          <Route
            path="/dashboard/parceiros/aprovacao"
            element={
              <PrivateRoute
                requiredPermissions={[
                  "partners_approve_nacional",
                  "partners_approve_estadual",
                  "partners_approve_municipal",
                ]}
              >
                <PartnersApproval />
              </PrivateRoute>
            }
          />

          <Route
            path="/dashboard/voluntarios"
            element={
              <PrivateRoute
                requiredPermissions={[
                  "volunteers_view_nacional",
                  "volunteers_view_estadual",
                  "volunteers_view_municipal",
                ]}
              >
                <VolunteersDashboard />
              </PrivateRoute>
            }
          />

          <Route
            path="/dashboard/coordenacoes"
            element={
              <PrivateRoute
                requiredPermissions={[
                  "coordenacoes_view_nacional",
                  "coordenacoes_view_estadual",
                  "coordenacoes_view_municipal",
                ]}
              >
                <CoordinatorsDashboard />
              </PrivateRoute>
            }
          />

          <Route
            path="/dashboard/coordenacoes/estaduais"
            element={
              <PrivateRoute
                requiredPermissions={[
                  "coordenacoes_view_nacional",
                  "coordenacoes_view_estadual",
                  "coordenacoes_view_municipal",
                ]}
              >
                <CoordinationsPage />
              </PrivateRoute>
            }
          />

          <Route
            path="/dashboard/ações/estaduais"
            element={
              <PrivateRoute
                requiredPermissions={[
                  "coordenacoes_view_nacional",
                  "coordenacoes_view_estadual",
                  "coordenacoes_view_municipal",
                ]}
              >
                <ProjectsPage />
              </PrivateRoute>
            }
          />

          <Route
            path="/dashboard/voluntarios/aprovacao"
            element={
              <PrivateRoute
                requiredPermissions={[
                  "volunteers_approve_nacional",
                  "volunteers_approve_estadual",
                  "volunteers_approve_municipal",
                ]}
              >
                <VolunteersApproval />
              </PrivateRoute>
            }
          />
        </Routes>
      </main>
      <Footer />
    </>
  );
}

export default App;
