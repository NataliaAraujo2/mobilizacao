import { createBranch } from "../domain/branches/branchModel";
import { getDbService } from "./firebaseDb";

function branchIdFromCode(code) {
  return code.trim().toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-");
}

export async function listBranches() {
  const { db, collection, getDocs } = await getDbService(["collection", "getDocs"]);
  const snapshot = await getDocs(collection(db, "branches"));

  return snapshot.docs
    .map((branchDoc) => ({ id: branchDoc.id, ...branchDoc.data() }))
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
}

export async function getBranch(id) {
  const { db, doc, getDoc } = await getDbService(["doc", "getDoc"]);
  const snapshot = await getDoc(doc(db, "branches", id));
  return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null;
}

export async function addBranch(input) {
  const { db, doc, getDoc, setDoc, serverTimestamp } = await getDbService([
    "doc", "getDoc", "setDoc", "serverTimestamp",
  ]);
  const data = createBranch(input);
  const id = branchIdFromCode(data.code);
  const reference = doc(db, "branches", id);

  if ((await getDoc(reference)).exists()) {
    const error = new Error("Já existe uma filial com esse código.");
    error.code = "branch/already-exists";
    throw error;
  }

  await setDoc(reference, {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return { id, ...data };
}

export async function editBranch(id, input) {
  const { db, doc, updateDoc, serverTimestamp } = await getDbService([
    "doc", "updateDoc", "serverTimestamp",
  ]);
  const data = createBranch(input);

  await updateDoc(doc(db, "branches", id), {
    name: data.name,
    state: data.state,
    status: data.status,
    updatedAt: serverTimestamp(),
  });

  return { id, ...data };
}
