import { getStorageService } from './firebaseStorage';
import { getDbService } from './firebaseDb';
import { validatePublicDocument, documentStoragePath } from '../domain/publicDocuments';

export async function listPublicDocuments() {
  const { db, collection, getDocs, query, orderBy } = await getDbService(['collection', 'getDocs', 'query', 'orderBy']);
  const result = await getDocs(query(collection(db, 'uploads'), orderBy('createdAt', 'desc')));
  return result.docs.map(item => ({ id: item.id, ...item.data() }));
}

export async function uploadPublicDocument(file, uid, onProgress) {
  validatePublicDocument(file);
  const header = new Uint8Array(await file.slice(0, 5).arrayBuffer());
  if (String.fromCharCode(...header) !== '%PDF-') throw new Error('O arquivo selecionado não é um PDF válido.');
  const id = crypto.randomUUID();
  const path = documentStoragePath(id);
  const { storage, ref, uploadBytesResumable, getDownloadURL, deleteObject } = await getStorageService();
  const reference = ref(storage, path);
  const task = uploadBytesResumable(reference, file, { contentType: 'application/pdf', contentDisposition: 'inline', cacheControl: 'public, max-age=3600' });
  await new Promise((resolve, reject) => task.on('state_changed', snapshot => onProgress?.(Math.round(100 * snapshot.bytesTransferred / snapshot.totalBytes)), reject, resolve));
  try {
    const url = await getDownloadURL(reference);
    const { db, doc, setDoc, serverTimestamp } = await getDbService(['doc', 'setDoc', 'serverTimestamp']);
    const data = { name: file.name, path, url, size: file.size, contentType: 'application/pdf', createdBy: uid };
    await setDoc(doc(db, 'uploads', id), { ...data, createdAt: serverTimestamp() });
    return { id, ...data };
  } catch (error) {
    try { await deleteObject(reference); }
    catch { throw new Error('O arquivo foi enviado, mas não foi listado nem removido. Procure a administração antes de repetir o upload.'); }
    throw error;
  }
}

export async function deletePublicDocument(item) {
  if (item.path !== documentStoragePath(item.id)) throw new Error('Este registro não pertence à nova área de documentos.');
  const { storage, ref, deleteObject } = await getStorageService();
  try { await deleteObject(ref(storage, item.path)); }
  catch (error) { if (error.code !== 'storage/object-not-found') throw error; }
  const { db, doc, deleteDoc } = await getDbService(['doc', 'deleteDoc']);
  await deleteDoc(doc(db, 'uploads', item.id));
}
