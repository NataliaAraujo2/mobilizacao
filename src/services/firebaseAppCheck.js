import { app } from './firebaseApp';

let initialization;

export async function initializeFirebaseAppCheck() {
  if (initialization) return initialization;
  if (import.meta.env.DEV && import.meta.env.VITE_USE_FIREBASE_EMULATORS === 'true') return null;
  const siteKey = import.meta.env.VITE_FIREBASE_APPCHECK_SITE_KEY;
  if (!siteKey) throw new Error('Proteção anti-robô não configurada.');
  initialization = import('firebase/app-check').then(({ initializeAppCheck, ReCaptchaEnterpriseProvider }) => initializeAppCheck(app, {
    provider: new ReCaptchaEnterpriseProvider(siteKey),
    isTokenAutoRefreshEnabled: true,
  }));
  return initialization;
}
