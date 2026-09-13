import { createAction } from "../domain/actions/actionModel";
import { compressImage } from "../utils/imageCompression";
import { getDbService } from "./firebaseDb";
import { getStorageService } from "./firebaseStorage";
import { normalizeSearchText } from '../../functions/contactFields.js';

async function removeOrphanedPhoto(deleteObject, fileRef) {
  // Uma segunda tentativa cobre falhas transitórias sem criar uma Function
  // agendada (e custo recorrente) só para limpeza.
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      await deleteObject(fileRef);
      return true;
    } catch {
      // A tentativa seguinte é deliberada; após isso não ocultamos o erro da
      // atualização original nem fingimos que o arquivo foi referenciado.
    }
  }
  return false;
}

export async function addAction(input) {
  const { db, addDoc, collection, serverTimestamp } = await getDbService(["addDoc", "collection", "serverTimestamp"]);
  const data = createAction(input);
  const reference = await addDoc(collection(db, "actions"), { ...data, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
  return { id: reference.id, ...data };
}

export async function listActionsPage({ search = "", cursor = null, pageSize = 20 } = {}) {
  const safePageSize = Math.min(Math.max(Number(pageSize) || 20, 1), 50);
  const term = normalizeSearchText(search);
  const { db, collection, endAt, getDocs, limit, orderBy, query, startAfter, startAt } = await getDbService([
    "collection", "endAt", "getDocs", "limit", "orderBy", "query", "startAfter", "startAt",
  ]);
  const constraints = [collection(db, "actions"), orderBy("nameSearch")];
  if (term) constraints.push(startAt(term), endAt(`${term}\uf8ff`));
  if (cursor) constraints.push(startAfter(cursor));
  constraints.push(limit(safePageSize + 1));
  const snapshot = await getDocs(query(...constraints));
  const documents = snapshot.docs.slice(0, safePageSize);
  return {
    data: documents.map((item) => ({ id: item.id, ...item.data() })),
    cursor: snapshot.docs.length > safePageSize ? documents.at(-1) : null,
    hasMore: snapshot.docs.length > safePageSize,
  };
}

export async function listActionsByBranch(branchId) {
  const { db, collection, getDocs, orderBy, query, where } = await getDbService(['collection', 'getDocs', 'orderBy', 'query', 'where']);
  const snapshot = await getDocs(query(collection(db, 'actions'), where('branchId', '==', branchId), orderBy('nameSearch')));
  return snapshot.docs.map(item => ({ id: item.id, ...item.data() }));
}

export async function getActionsByIds(ids = []) {
  const uniqueIds = [...new Set(ids)].filter(Boolean).slice(0, 20);
  const { db, doc, getDoc } = await getDbService(['doc', 'getDoc']);
  const snapshots = await Promise.all(uniqueIds.map(id => getDoc(doc(db, 'actions', id))));
  return snapshots.filter(item => item.exists()).map(item => ({ id: item.id, ...item.data() }));
}

export async function uploadActionPhotos(action, phase, files, onProgress) {
  const field = { before: "photosBefore", during: "photosDuring", after: "photosAfter" }[phase];
  if (!field) throw new Error("Etapa das fotos inválida.");
  const { storage, ref, uploadBytesResumable, deleteObject } = await getStorageService();
  const { db, arrayUnion, doc, serverTimestamp, updateDoc } = await getDbService(["arrayUnion", "doc", "serverTimestamp", "updateDoc"]);

  for (let index = 0; index < files.length; index += 1) {
    const compressed = await compressImage(files[index]);
    const safeName = `${Date.now()}-${index}-${compressed.name.replace(/[^a-zA-Z0-9._-]/g, "-")}`;
    const path = `branches/${action.branchId}/actions/${action.id}/${phase}/${safeName}`;
    const fileRef = ref(storage, path);
    const task = uploadBytesResumable(fileRef, compressed, { contentType: "image/webp" });
    await new Promise((resolve, reject) => task.on("state_changed", undefined, reject, resolve));
    try {
      await updateDoc(doc(db, "actions", action.id), {
        [field]: arrayUnion({ path, name: compressed.name, size: compressed.size }),
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      // Evita custo recorrente de imagem órfã quando o catálogo no Firestore falhar.
      await removeOrphanedPhoto(deleteObject, fileRef);
      throw error;
    }
    onProgress?.(index + 1, files.length);
  }
}
