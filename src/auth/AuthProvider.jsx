import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { getAuthService } from "../services/firebaseAuth";
import { resolveBranchViewerLogin } from "../services/firebaseFunctions";
import { resolveLoginIdentity } from "../domain/access/loginIdentity";
import { AuthContext } from "./AuthContext";

const SUPERADMIN_IDLE_TIMEOUT_MS = 60 * 60 * 1000;
const SUPERADMIN_IDLE_NOTICE_KEY = "mobilizacao.superadmin-idle-expired";

export default function AuthProvider({ children }) {
  const { pathname } = useLocation();
  const [session, setSession] = useState({ user: null, claims: null, loading: true, checked: false });
  const needsSession = pathname === "/login" || pathname.startsWith("/admin") || pathname.startsWith("/consulta") || pathname.startsWith("/presencas") || pathname.startsWith("/voluntario") || pathname.startsWith("/2026");

  useEffect(() => {
    if (!needsSession) {
      setSession(current => current.loading ? { user: null, claims: null, loading: false, checked: false } : current);
      return undefined;
    }

    let active = true;
    let unsubscribe = () => {};

    getAuthService().then((service) => {
      if (!active) return;

      unsubscribe = service.onAuthStateChanged(service.auth, async (user) => {
        if (!active) return;

        if (!user) {
          setSession({ user: null, claims: null, loading: false, checked: true });
          return;
        }

        try {
          const token = await service.getIdTokenResult(user, true);
          if (token.claims.role === "branchViewer") {
            await service.setPersistence(service.auth, service.browserSessionPersistence);
          }
          if (active) setSession({ user, claims: token.claims, loading: false, checked: true });
        } catch {
          if (active) setSession({ user: null, claims: null, loading: false, checked: true });
        }
      });
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [needsSession]);

  useEffect(() => {
    if (!session.user || session.claims?.role !== "superAdmin") return undefined;

    let timer;
    let signedOut = false;
    let lastActivityAt = Date.now();
    const activityEvents = ["pointerdown", "pointermove", "keydown", "touchstart", "scroll", "focus"];

    async function endIdleSession() {
      if (signedOut) return;
      signedOut = true;
      try { sessionStorage.setItem(SUPERADMIN_IDLE_NOTICE_KEY, "true"); } catch { /* O logout continua mesmo sem storage. */ }
      try {
        const service = await getAuthService();
        await service.signOut(service.auth);
      } finally {
        setSession({ user: null, claims: null, loading: false, checked: true });
      }
    }

    function scheduleLogout() {
      window.clearTimeout(timer);
      timer = window.setTimeout(endIdleSession, SUPERADMIN_IDLE_TIMEOUT_MS);
    }

    function registerActivity() {
      const now = Date.now();
      if (now - lastActivityAt < 1_000) return;
      lastActivityAt = now;
      scheduleLogout();
    }

    scheduleLogout();
    activityEvents.forEach((eventName) => window.addEventListener(eventName, registerActivity, { passive: true }));
    return () => {
      window.clearTimeout(timer);
      activityEvents.forEach((eventName) => window.removeEventListener(eventName, registerActivity));
    };
  }, [session.claims?.role, session.user]);

  const value = useMemo(() => ({
    ...session,
    loading: needsSession && (!session.checked || session.loading),
    async login(identity, password) {
      const service = await getAuthService();
      let email = resolveLoginIdentity(identity);
      try {
        const resolvedEmail = await resolveBranchViewerLogin(identity);
        if (resolvedEmail) email = resolvedEmail;
      } catch {
        // Superadmins e voluntários continuam usando diretamente o e-mail informado.
      }
      const credential = await service.signInWithEmailAndPassword(service.auth, email, password);
      const token = await service.getIdTokenResult(credential.user, true);
      if (token.claims.role === "branchViewer") {
        await service.setPersistence(service.auth, service.browserSessionPersistence);
      } else {
        await service.setPersistence(service.auth, service.browserLocalPersistence);
      }
      setSession({ user: credential.user, claims: token.claims, loading: false, checked: true });
      return token.claims;
    },
    async logout() {
      const service = await getAuthService();
      await service.signOut(service.auth);
    },
    async refreshClaims() {
      if (!session.user) return null;
      const service = await getAuthService();
      const token = await service.getIdTokenResult(session.user, true);
      setSession(current => ({ ...current, claims: token.claims, loading: false, checked: true }));
      return token.claims;
    },
  }), [needsSession, session]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
