import { getAuthService } from './firebaseAuth';
import { getDbService } from './firebaseDb';
import { getFunctionsService } from './firebaseFunctions';
import { getPublicActionById, listPublicActionsByCoordinationState } from './actionsService';

async function call(name, data) {
  const { functions, httpsCallable } = await getFunctionsService({ appCheck: true });
  return (await httpsCallable(functions, name)(data)).data;
}

// A navegação no mapa é leitura pública, sem dados pessoais. Ela vai direto
// ao Firestore para não depender do tempo de inicialização de uma Function.
export function listPublicActions(state) { return listPublicActionsByCoordinationState(state); }
export async function getPublicAction(actionId) { return [await getPublicActionById(actionId)]; }
export async function getPublicVolunteerCount(year) {
  const safeYear = String(year ?? '');
  if (!/^20\d{2}$/.test(safeYear)) return { count: 0 };
  const { db, doc, getDoc } = await getDbService(['doc', 'getDoc']);
  const snapshot = await getDoc(doc(db, 'publicStats', `volunteerCounter-${safeYear}`));
  const total = snapshot.exists() ? snapshot.data().total : null;
  if (Number.isSafeInteger(total) && total >= 0) return { count: total };
  return { count: 0 };
}
export function enrollInAction(actionId, profile, replaceActionId = '') { return call('enrollVolunteer', { actionId, profile, replaceActionId }); }
export function registerPublicVolunteer(actionId, profile) { return call('registerPublicVolunteer', { actionId, profile }); }
export function withdrawFromAction(actionId) { return call('withdrawVolunteer', { actionId }); }
export function getVolunteerDashboard() { return call('getVolunteerDashboard', {}); }
export function confirmVolunteerAttendance(actionId) { return call('confirmVolunteerAttendance', { actionId }); }

export async function createVolunteerAccount(email, password) {
  const service = await getAuthService();
  return service.createUserWithEmailAndPassword(service.auth, email.trim().toLowerCase(), password);
}

export async function loginVolunteer(email, password) {
  const service = await getAuthService();
  return service.signInWithEmailAndPassword(service.auth, email.trim().toLowerCase(), password);
}

export async function refreshVolunteerSession(user) {
  const service = await getAuthService();
  return service.getIdTokenResult(user, true);
}

export async function removeCurrentAccount(user) {
  const service = await getAuthService();
  return service.deleteUser(user);
}
