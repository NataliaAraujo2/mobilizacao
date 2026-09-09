/**
* ================================================================
* SISTEMA
* Plataforma Jurídica SaaS
*
* ARQUIVO
* firebaseStorage.js
*
* CAMADA
* Infraestrutura
*
* DIRETÓRIO
* src/infraestrutura/firebase
*
* DESCRIÇÃO
* Responsável por fornecer acesso ao Firebase Storage
* de forma lazy (carregamento sob demanda) e com cache.
*
* RESPONSABILIDADES
* - Inicializar Storage sob demanda
* - Evitar múltiplas instâncias
* - Centralizar acesso ao Storage
*
* AUTOR
* Natália de Araujo Nogueira
* ================================================================
*/

import { app } from "./firebaseApp";

let cachedStorage = null;

/**
 * Retorna os helpers do Firebase Storage (lazy + cache)
 * @returns {Promise<object>}
 */
export async function getStorageService() {
  if (cachedStorage) return cachedStorage;

  const {
    getStorage,
    ref,
    uploadBytesResumable,
    getDownloadURL,
    deleteObject,
    connectStorageEmulator,
  } = await import("firebase/storage");

  const storage = getStorage(app);

  if (import.meta.env.DEV && import.meta.env.VITE_USE_FIREBASE_EMULATORS === "true") {
    connectStorageEmulator(storage, "127.0.0.1", 9199);
  }

  cachedStorage = Object.freeze({
    storage,
    ref,
    uploadBytesResumable,
    getDownloadURL,
    deleteObject,
  });

  return cachedStorage;
}
