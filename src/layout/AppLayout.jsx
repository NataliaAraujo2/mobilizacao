import { Link, Outlet, useLocation } from "react-router-dom";
import AdminInstall from "../components/AdminInstall";
import BackButton from "../components/BackButton";
import Footer from "../components/Footer";
import { useAuth } from "../auth/useAuth";
import styles from "./AppLayout.module.css";

export default function AppLayout() {
  const { pathname } = useLocation();
  const adminArea = pathname === "/admin" || pathname.startsWith("/admin/");
  const publicArea = pathname === "/" || pathname === "/2025";
  const { user, claims, logout } = useAuth();
  const accountPath = claims?.role === "volunteer" ? "/voluntario" : claims?.role === "branchViewer" ? "/consulta" : "/admin";
  const derivedAccountPage = user && pathname !== accountPath && (
    pathname.startsWith('/admin/') || pathname.startsWith('/consulta/') || pathname.startsWith('/voluntario/')
  ) && !pathname.endsWith('/login');

  return (
    <>
      <header className={styles.header}>
        <Link className={styles.brand} to="/" aria-label="MobilizAÇÃO — página inicial">
          <small>ONG Moradia e Cidadania</small>
          <strong><span>Mobiliz</span><em>AÇÃO</em></strong>
        </Link>
        <nav aria-label="Navegação principal">
          {publicArea ? (
            <>
              <Link to="/">Início</Link>
              <a href="/#acoes-2026">Ações 2026</a>
              <a href="/#agenda-2030">Agenda 2030</a>
              <Link to="/2025">Edição 2025</Link>
            </>
          ) : user ? (
            <>
              <Link to={accountPath}>Minha área</Link>
              <AdminInstall />
              <button type="button" onClick={logout}>Sair</button>
            </>
          ) : (
            <Link to={adminArea ? "/admin/login" : "/login"}>{adminArea ? "Entrar" : "Entrar como voluntário"}</Link>
          )}
        </nav>
      </header>
      {derivedAccountPage && <BackButton fallback={accountPath} />}
      <Outlet />
      <Footer />
    </>
  );
}
