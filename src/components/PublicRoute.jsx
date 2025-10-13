// src/components/PublicRoute.jsx
import { Navigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

export default function PublicRoute({ children }) {
  const { user, scope } = useAuth();

  // 🔹 Se o usuário já estiver logado e tentar acessar Home ou Login,
  // redireciona direto para o dashboard correto
  if (user && scope?.nivel) {
    switch (scope.nivel) {
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
