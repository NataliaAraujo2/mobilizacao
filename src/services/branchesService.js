import { createBranch } from "../domain/branches/branchModel";
import { getDbService } from "./firebaseDb";

const CACHE_MS = 60_000;
let branchesCache = null;
let branchesPromise = null;
function clearBranchesCache() { branchesCache = null; branchesPromise = null; }

function branchIdFromCode(code) {
  return code.trim().toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-");
}

export async function listBranches() {
  if (branchesCache?.expiresAt > Date.now()) return branchesCache.data;
  if (branchesPromise) return branchesPromise;
  branchesPromise = loadBranches();
  try {
    const data = await branchesPromise;
    branchesCache = { data, expiresAt: Date.now() + CACHE_MS };
    return data;
  } finally { branchesPromise = null; }
}

async function loadBranches() {
  const { db, collection, getDocs } = await getDbService(["collection", "getDocs"]);
  const snapshot = await getDocs(collection(db, "branches"));

  return snapshot.docs
    .map((branchDoc) => ({ id: branchDoc.id, ...branchDoc.data() }))
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
}

export async function getBranch(id) {
  if (branchesCache?.expiresAt > Date.now()) return branchesCache.data.find(branch => branch.id === id) ?? null;
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
    const error = new Error("Já existe uma coordenação estadual com esse código.");
    error.code = "branch/already-exists";
    throw error;
  }

  await setDoc(reference, {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  clearBranchesCache();
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
  clearBranchesCache();
  return { id, ...data };
}

export async function deleteBranch(id) {
  const { db, collection, deleteDoc, doc, getDocs, limit, query, where } = await getDbService([
    "collection", "deleteDoc", "doc", "getDocs", "limit", "query", "where",
  ]);
  const [actions, viewers] = await Promise.all([
    getDocs(query(collection(db, "actions"), where("branchId", "==", id), limit(1))),
    getDocs(query(collection(db, "users"), where("branchId", "==", id), limit(1))),
  ]);
  if (!actions.empty || !viewers.empty) {
    const error = new Error("Exclua primeiro as ações e os usuários vinculados a esta coordenação.");
    error.code = "branch/has-linked-records";
    throw error;
  }
  await deleteDoc(doc(db, "branches", id));
  clearBranchesCache();
}
