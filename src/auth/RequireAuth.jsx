import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "./useAuth";

export default function RequireAuth({ allowedRoles }) {
  const { user, claims, loading } = useAuth();
  const location = useLocation();

  if (loading) return <main aria-busy="true">Verificando acesso...</main>;
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
  if (claims?.status !== "active") return <Navigate to="/acesso-bloqueado" replace />;
  if (allowedRoles && !allowedRoles.includes(claims?.role)) return <Navigate to="/sem-permissao" replace />;

  return <Outlet />;
}
