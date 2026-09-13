import { app } from "./firebaseApp";
import { initializeFirebaseAppCheck } from './firebaseAppCheck';

let cachedFunctions = null;

export async function getFunctionsService({ appCheck = false } = {}) {
  if (appCheck) await initializeFirebaseAppCheck();
  if (cachedFunctions) return cachedFunctions;

  const { connectFunctionsEmulator, getFunctions, httpsCallable } = await import("firebase/functions");
  const functions = getFunctions(app, "southamerica-east1");

  if (import.meta.env.DEV && import.meta.env.VITE_USE_FIREBASE_EMULATORS === "true") {
    connectFunctionsEmulator(functions, "127.0.0.1", 5001);
  }

  cachedFunctions = Object.freeze({ functions, httpsCallable });
  return cachedFunctions;
}
