import { createAction } from "../domain/actions/actionModel";
import { compressImage } from "../utils/imageCompression";
import { getDbService } from "./firebaseDb";
import { getStorageService } from "./firebaseStorage";

export async function addAction(input) {
  const { db, addDoc, collection, serverTimestamp } = await getDbService(["addDoc", "collection", "serverTimestamp"]);
  const data = createAction(input);
  const reference = await addDoc(collection(db, "actions"), { ...data, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
  return { id: reference.id, ...data };
}

export async function listActions() {
  const { db, collection, getDocs } = await getDbService(["collection", "getDocs"]);
  const snapshot = await getDocs(collection(db, "actions"));
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() })).sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
}

export async function uploadActionPhotos(action, phase, files, onProgress) {
  const field = { before: "photosBefore", during: "photosDuring", after: "photosAfter" }[phase];
  if (!field) throw new Error("Etapa das fotos inválida.");
  const { storage, ref, uploadBytesResumable } = await getStorageService();
  const { db, arrayUnion, doc, serverTimestamp, updateDoc } = await getDbService(["arrayUnion", "doc", "serverTimestamp", "updateDoc"]);

  for (let index = 0; index < files.length; index += 1) {
    const compressed = await compressImage(files[index]);
    const safeName = `${Date.now()}-${index}-${compressed.name.replace(/[^a-zA-Z0-9._-]/g, "-")}`;
    const path = `branches/${action.branchId}/actions/${action.id}/${phase}/${safeName}`;
    const task = uploadBytesResumable(ref(storage, path), compressed, { contentType: "image/webp" });
    await new Promise((resolve, reject) => task.on("state_changed", undefined, reject, resolve));
    await updateDoc(doc(db, "actions", action.id), {
      [field]: arrayUnion({ path, name: compressed.name, size: compressed.size }),
      updatedAt: serverTimestamp(),
    });
    onProgress?.(index + 1, files.length);
  }
}
