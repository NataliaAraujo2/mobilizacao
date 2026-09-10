import { getDbService } from "./firebaseDb";
import { getFunctionsService } from "./firebaseFunctions";

export async function listBranchContactsPage({ search = '', cursor = null } = {}) {
  const { db, collection, getDocs, query, where, orderBy, startAt, endAt, startAfter, limit } = await getDbService(['collection', 'getDocs', 'query', 'where', 'orderBy', 'startAt', 'endAt', 'startAfter', 'limit']);
  const constraints = [where('role', '==', 'branchViewer'), orderBy('contactName')];
  const term = search.trim();
  if (term) constraints.push(startAt(term), endAt(`${term}\uf8ff`));
  if (cursor) constraints.push(startAfter(cursor));
  const snapshot = await getDocs(query(collection(db, 'users'), ...constraints, limit(26)));
  const docs = snapshot.docs.slice(0, 25);
  return {
    data: docs.map(item => { const data = item.data(); return { id: item.id, fullName: data.contactName, phone: data.contactPhone || '', branchLabel: data.displayName, branchId: data.branchId }; }),
    hasMore: snapshot.size > 25,
    cursor: snapshot.size > 25 ? docs.at(-1) : null,
  };
}

export async function listBranchViewers() {
  const { db, collection, getDocs, query, where } = await getDbService(["collection", "getDocs", "query", "where"]);
  const snapshot = await getDocs(query(collection(db, "users"), where("role", "==", "branchViewer")));
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
}

async function callFunction(name, data) {
  const { functions, httpsCallable } = await getFunctionsService();
  return (await httpsCallable(functions, name)(data)).data;
}

export async function createBranchViewer(input) {
  return callFunction("createBranchViewer", input);
}

export async function updateBranchViewerContact(uid, contact) {
  return callFunction("updateBranchViewerContact", { uid, ...contact });
}

export async function updateBranchViewer(uid, status) {
  return callFunction("updateBranchViewer", { uid, status });
}

export async function resetBranchViewerPassword(uid) {
  return callFunction("resetBranchViewerPassword", { uid });
}

export async function createSuperAdmin(input) {
  return callFunction("createSuperAdmin", input);
}

export async function completeSuperAdminPasswordChange(password) {
  return callFunction("completeSuperAdminPasswordChange", { password });
}
