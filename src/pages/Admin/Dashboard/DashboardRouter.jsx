// src/pages/dashboard/DashboardRouter.jsx
import { useAuth } from "../../../hooks/useAuth";
import NationalDashboard from "./NationalDashboard";
import StateDashboard from "./StateDashboard";
import MunicipalDashboard from "./MunicipalDashboard";
import PartnerDashboard from "./PartnerDashboard";
import VolunteerDashboard from "./VolunteerDashboard";
import Loading from "../../../components/ui/Loading";

export default function DashboardRouter() {
  const { scope, loading } = useAuth();

  if (loading) return <Loading message="Carregando dashboard..." />;

  switch (scope?.nivel) {
    case "nacional":
      return <NationalDashboard />;
    case "estadual":
      return <StateDashboard />;
    case "municipal":
      return <MunicipalDashboard />;
    case "partner":
      return <PartnerDashboard />;
    case "volunteer":
      return <VolunteerDashboard />;
    default:
      return <p>Escopo não reconhecido. Contate o administrador.</p>;
  }
}

