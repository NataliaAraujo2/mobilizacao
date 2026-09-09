import { getDbService } from "./firebaseDb";
import { getFunctionsService } from "./firebaseFunctions";

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
