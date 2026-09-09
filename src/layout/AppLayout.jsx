import { Link, Outlet } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import mobilizacaoLogo from "../assets/brand/mobilizacao-logo-colorido.webp";
import styles from "./AppLayout.module.css";

export default function AppLayout() {
  const { user, claims, logout } = useAuth();
  const accountPath = claims?.role === "volunteer" ? "/voluntario" : claims?.role === "branchViewer" ? "/consulta" : "/admin";

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
              <button type="button" onClick={logout}>Sair</button>
            </>
          ) : (
            <Link to="/login">Entrar</Link>
          )}
        </nav>
      </header>
      <Outlet />
    </>
  );
}
