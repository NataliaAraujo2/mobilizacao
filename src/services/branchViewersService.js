import { getDbService } from "./firebaseDb";
import { getFunctionsService } from "./firebaseFunctions";
import { normalizeSearchText } from '../../functions/contactFields.js';

const CACHE_MS = 60_000;
let viewersCache = null;
let viewersPromise = null;
function clearViewersCache() { viewersCache = null; viewersPromise = null; }

export async function listBranchContactsPage({ search = '', cursor = null, pageSize = 10 } = {}) {
  const { db, collection, getDocs, query, where, orderBy, startAt, endAt, startAfter, limit } = await getDbService(['collection', 'getDocs', 'query', 'where', 'orderBy', 'startAt', 'endAt', 'startAfter', 'limit']);
  const constraints = [where('role', '==', 'branchViewer'), orderBy('contactNameSearch')];
  const term = normalizeSearchText(search);
  if (term) constraints.push(startAt(term), endAt(`${term}\uf8ff`));
  if (cursor) constraints.push(startAfter(cursor));
  const safePageSize = Math.min(Math.max(Number(pageSize) || 10, 1), 50);
  const snapshot = await getDocs(query(collection(db, 'users'), ...constraints, limit(safePageSize + 1)));
  const docs = snapshot.docs.slice(0, safePageSize);
  return {
    data: docs.map(item => { const data = item.data(); return { id: item.id, fullName: data.contactName, phone: data.contactPhone || '', branchLabel: data.displayName, branchId: data.branchId }; }),
    hasMore: snapshot.size > safePageSize,
    cursor: snapshot.size > safePageSize ? docs.at(-1) : null,
  };
}

export async function listBranchViewers() {
  if (viewersCache?.expiresAt > Date.now()) return viewersCache.data;
  if (viewersPromise) return viewersPromise;
  viewersPromise = loadBranchViewers();
  try {
    const data = await viewersPromise;
    viewersCache = { data, expiresAt: Date.now() + CACHE_MS };
    return data;
  } finally { viewersPromise = null; }
}

async function loadBranchViewers() {
  const { db, collection, getDocs, query, where } = await getDbService(["collection", "getDocs", "query", "where"]);
  const snapshot = await getDocs(query(collection(db, "users"), where("role", "==", "branchViewer")));
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
}

export async function getBranchViewerByBranch(branchId) {
  if (viewersCache?.expiresAt > Date.now()) return viewersCache.data.find(viewer => viewer.branchId === branchId) ?? null;
  const { db, doc, getDoc } = await getDbService(['doc', 'getDoc']);
  const snapshot = await getDoc(doc(db, 'users', `branch-viewer-${branchId}`));
  return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null;
}

async function callFunction(name, data) {
  const { functions, httpsCallable } = await getFunctionsService();
  return (await httpsCallable(functions, name)(data)).data;
}

export async function createBranchViewer(input) {
  const result = await callFunction("createBranchViewer", input); clearViewersCache(); return result;
}

export async function deleteBranchViewer(uid) {
  const result = await callFunction('deleteBranchViewer', { uid }); clearViewersCache(); return result;
}

export async function updateBranchViewerContact(uid, contact) {
  const result = await callFunction("updateBranchViewerContact", { uid, ...contact }); clearViewersCache(); return result;
}

export async function updateBranchViewer(uid, status) {
  const result = await callFunction("updateBranchViewer", { uid, status }); clearViewersCache(); return result;
}

export async function resetBranchViewerPassword(uid) {
  return callFunction("resetBranchViewerPassword", { uid });
}

export async function createSuperAdmin(input) {
  return callFunction("createSuperAdmin", input);
}

export async function listSuperAdmins() {
  const { db, collection, getDocs, query, where } = await getDbService(["collection", "getDocs", "query", "where"]);
  const snapshot = await getDocs(query(collection(db, "users"), where("role", "==", "superAdmin")));
  return snapshot.docs
    .map((item) => ({ id: item.id, ...item.data() }))
    .sort((first, second) => String(first.displayName ?? "").localeCompare(String(second.displayName ?? ""), "pt-BR"));
}

export async function completeInitialPasswordChange(password) {
  return callFunction("completeSuperAdminPasswordChange", { password });
}
