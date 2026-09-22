import { useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import styles from "./LoginPage.module.css";

const AUTH_ERRORS = {
  "auth/invalid-credential": "Usuário ou senha incorretos.",
  "auth/invalid-email": "Informe um usuário ou e-mail válido.",
  "auth/too-many-requests": "Muitas tentativas. Aguarde um pouco e tente novamente.",
  "auth/network-request-failed": "Não foi possível conectar ao serviço de autenticação local.",
};

function destinationForRole(role) {
  if (role === "volunteer") return "/voluntario";
  if (role === "branchViewer") return "/consulta";
  return "/admin";
}

function permittedDestination(role, requestedPath) {
  if (!requestedPath) return destinationForRole(role);
  if (role === "superAdmin" && requestedPath.startsWith("/admin")) return requestedPath;
  if (role === "volunteer" && (requestedPath === "/voluntario" || requestedPath.startsWith("/presenca/"))) return requestedPath;
  if (role === "branchViewer" && requestedPath === "/consulta") return requestedPath;
  return destinationForRole(role);
}

export default function LoginPage() {
  const { user, claims, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [expiredByInactivity] = useState(() => {
    try {
      const expired = sessionStorage.getItem("mobilizacao.superadmin-idle-expired") === "true";
      if (expired) sessionStorage.removeItem("mobilizacao.superadmin-idle-expired");
      return expired;
    } catch {
      return false;
    }
  });
  const coordinatorAccess = location.pathname.startsWith('/admin/');

  const destination = destinationForRole(claims?.role);
  if (user) return <Navigate to={destination} replace />;

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      const nextClaims = await login(form.email, form.password);
      navigate(permittedDestination(nextClaims.role, location.state?.from?.pathname), { replace: true });
    } catch (authError) {
      setError(AUTH_ERRORS[authError.code] ?? "Não foi possível entrar. Confira os dados e tente novamente.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className={styles.page}>
      <section className={styles.card} aria-labelledby="login-title">
        <p className={styles.eyebrow}>{coordinatorAccess ? 'Coordenação e administração' : 'Área do voluntário'}</p>
        <h1 id="login-title">{coordinatorAccess ? 'Acesso da coordenação' : 'Entrar como voluntário'}</h1>
        <p>{coordinatorAccess ? 'Acesse com o usuário ou e-mail da sua coordenação.' : 'Acesse com seu e-mail e senha de voluntário.'}</p>
        {expiredByInactivity && <p className={styles.notice} role="status">Sua sessão foi encerrada após 1 hora de inatividade.</p>}

        <form onSubmit={handleSubmit}>
          <label htmlFor="email">Nome de usuário ou e-mail</label>
          <input id="email" type="text" autoComplete="username" required value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />

          <label htmlFor="password">Senha</label>
          <div className={styles.passwordField}>
            <input id="password" type={showPassword ? "text" : "password"} autoComplete="current-password" required value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} />
            <button className={styles.passwordToggle} type="button" aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"} title={showPassword ? "Ocultar senha" : "Mostrar senha"} aria-controls="password" onClick={() => setShowPassword(current => !current)}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
                <circle cx="12" cy="12" r="3" />
                {showPassword && <path d="m3 3 18 18" />}
              </svg>
            </button>
          </div>

          {error && <p className={styles.error} role="alert">{error}</p>}
          <button type="submit" disabled={submitting}>{submitting ? "Entrando..." : "Entrar"}</button>
        </form>
      </section>
    </main>
  );
}
