import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { getAuthService } from "../services/firebaseAuth";
import { AuthContext } from "./AuthContext";

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

  const value = useMemo(() => ({
    ...session,
    loading: needsSession && (!session.checked || session.loading),
    async login(email, password) {
      const service = await getAuthService();
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
