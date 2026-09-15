import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "./useAuth";
import InitialPasswordChange from "./InitialPasswordChange";

export default function RequireAuth({ allowedRoles }) {
  const { user, claims, loading } = useAuth();
  const location = useLocation();
  const prefix = location.pathname === "/admin" || location.pathname.startsWith("/admin/") ? "/admin" : "";

  if (loading) return <main aria-busy="true">Verificando acesso...</main>;
  if (!user) return <Navigate to={`${prefix}/login`} replace state={{ from: location }} />;
  if (claims?.status !== "active") return <Navigate to={`${prefix}/acesso-bloqueado`} replace />;
  if (allowedRoles && !allowedRoles.includes(claims?.role)) return <Navigate to={`${prefix}/sem-permissao`} replace />;
  if (claims?.mustChangePassword) return <InitialPasswordChange />;

  return <Outlet />;
}
