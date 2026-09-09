// firebaseDb.js — Versão C (Turbo + Pré-Bundle + Import Seletivo)
// -----------------------------------------------------------
// - Lazy loading total
// - Cache global
// - Import seletivo via getDbService(["doc","getDoc", ...])
// - Pré-lista com TODOS operadores usados no projeto
// - Minimiza bundle ao máximo
// -----------------------------------------------------------

import { app } from "./firebaseApp";

// Cache para evitar recarregar módulos
let cachedDb = null;
let cachedImports = {};

// Lista global dos operadores Firestore usados no projeto
// (manter sempre esta lista atualizada — garante nenhum erro de função ausente)
const FIRESTORE_OPERATORS = {
  getFirestore: null,
  collection: null,
  doc: null,
  getDoc: null,
  getDocs: null,
  addDoc: null,
  setDoc: null,
  updateDoc: null,
  deleteDoc: null,
  where: null,
  orderBy: null,
  limit: null,
  startAfter: null,
  query: null,
  onSnapshot: null,
  serverTimestamp: null,
  writeBatch: null,
  arrayUnion: null,
  connectFirestoreEmulator: null,
};

// Função de importação preguiçosa (lazy)
async function loadFirestoreOperators() {
  if (Object.values(FIRESTORE_OPERATORS).some((fn) => fn === null)) {
    const module = await import("firebase/firestore");

    Object.keys(FIRESTORE_OPERATORS).forEach((key) => {
      FIRESTORE_OPERATORS[key] = module[key];
    });
  }

  return FIRESTORE_OPERATORS;
}

// Loader principal
export async function getDbService(requested = []) {
  // Retorna db em cache
  if (!cachedDb) {
    const { getFirestore } = await loadFirestoreOperators();
    const db = getFirestore(app);

    if (import.meta.env.DEV && import.meta.env.VITE_USE_FIREBASE_EMULATORS === "true") {
      const { connectFirestoreEmulator } = await loadFirestoreOperators();
      connectFirestoreEmulator(db, "127.0.0.1", 8080);
    }

    cachedDb = { db };
  }

  // Se o usuário não pediu funções específicas → só retorna { db }
  if (!requested || requested.length === 0) {
    return cachedDb;
  }

  // Se pediu funções → garantir que já carregamos firestore
  const ops = await loadFirestoreOperators();

  const selected = { ...cachedDb }; // inclui sempre db

  for (const key of requested) {
    if (!ops[key]) {
      console.warn(`⚠️ Função Firestore '${key}' não existe ou não está na lista FIRESTORE_OPERATORS.`);
      continue;
    }

    // Cache de funções importadas
    if (!cachedImports[key]) {
      cachedImports[key] = ops[key];
    }

    selected[key] = cachedImports[key];
  }

  return selected;
}
