import { Link, Outlet, useLocation } from "react-router-dom";
import AdminInstall from "../components/AdminInstall";
import BackButton from "../components/BackButton";
import Footer from "../components/Footer";
import { useAuth } from "../auth/useAuth";
import mobilizacaoLogo from "../assets/brand/mobilizacao-logo-colorido.webp";
import styles from "./AppLayout.module.css";

export default function AppLayout() {
  const { pathname } = useLocation();
  const adminArea = pathname === "/admin" || pathname.startsWith("/admin/");
  const { user, claims, logout } = useAuth();
  const accountPath = claims?.role === "volunteer" ? "/voluntario" : claims?.role === "branchViewer" ? "/consulta" : "/admin";
  const derivedAccountPage = user && pathname !== accountPath && (
    pathname.startsWith('/admin/') || pathname.startsWith('/consulta/') || pathname.startsWith('/voluntario/')
  ) && !pathname.endsWith('/login');

  return (
    <>
      <header className={styles.header}>
        <Link className={styles.brand} to="/" aria-label="MobilizAÇÃO — página inicial">
          <img
            src={mobilizacaoLogo}
            alt="MobilizAÇÃO — Semeando e Cultivando o Futuro"
            width="1400"
            height="1466"
          />
        </Link>
        <nav aria-label="Navegação principal">
          {user ? (
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
