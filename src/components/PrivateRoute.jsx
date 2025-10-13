import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import Loading from "./ui/Loading";

export default function PrivateRoute({
  children,
  requiredPermissions = [],
  requireAll = false,
}) {
  const { user, permissions = [], scope, loading } = useAuth();
  const location = useLocation();

  if (loading) return <Loading message="Verificando acesso..." />;
  if (!user) return <Navigate to="/" replace />;

  // 🔹 Checa permissões específicas
  if (requiredPermissions.length > 0) {
    const hasAll = requiredPermissions.every((p) => permissions.includes(p));
    const hasAny = requiredPermissions.some((p) => permissions.includes(p));
    const hasAccess = requireAll ? hasAll : hasAny;

    if (!hasAccess) {
      console.warn("🚫 Acesso negado:", {
        user,
        permissions,
        requiredPermissions,
      });
      return <Navigate to="/unauthorized" replace />;
    }
  }

  // 🔹 Redirecionamento automático baseado no escopo
  if (location.pathname === "/") {
    switch (scope?.nivel) {
      case "nacional":
        return <Navigate to="/dashboard/nacional" replace />;
      case "estadual":
        return <Navigate to="/dashboard/estadual" replace />;
      case "municipal":
        return <Navigate to="/dashboard/municipal" replace />;
      case "parceiro":
        return <Navigate to="/dashboard/parceiro" replace />;
      case "voluntario":
        return <Navigate to="/dashboard/voluntario" replace />;
      default:
        return <Navigate to="/unauthorized" replace />;
    }
  }

  return children;
}
