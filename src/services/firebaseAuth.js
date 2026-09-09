import { app } from "./firebaseApp";

let cachedAuth = null;
let initialized = false;

/**
 * Retorna os helpers de Auth do Firebase (lazy, cache, persistência)
 * @returns {Promise<object>} - { auth, onAuthStateChanged, signOut, ... }
 */
export async function getAuthService() {
  if (cachedAuth) return cachedAuth;

  const {
    getAuth,
    onAuthStateChanged,
    signOut,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    sendPasswordResetEmail,
    updatePassword,
    updateEmail,
    setPersistence,
    browserLocalPersistence,
    connectAuthEmulator,
    getIdTokenResult,
  } = await import("firebase/auth");

  const auth = getAuth(app);

  if (import.meta.env.DEV && import.meta.env.VITE_USE_FIREBASE_EMULATORS === "true") {
    connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
  }

  // Inicializar persistência apenas 1 vez (melhora UX ao recarregar a página)
  try {
    if (!initialized && setPersistence && browserLocalPersistence) {
      // setPersistence pode falhar em ambientes não-browser (ex: SSR), por isso try/catch
      await setPersistence(auth, browserLocalPersistence);
      initialized = true;
    }
  } catch (err) {
 console.warn("Não foi possível setar persistência do auth:", err);
  }

  cachedAuth = Object.freeze({
    auth,
    onAuthStateChanged,
    signOut,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    sendPasswordResetEmail,
    updatePassword,
    updateEmail,
    getIdTokenResult,
  });

  return cachedAuth;
}
