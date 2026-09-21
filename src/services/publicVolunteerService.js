import { getAuthService } from './firebaseAuth';
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
export function enrollInAction(actionId, profile, replaceActionId = '') { return call('enrollVolunteer', { actionId, profile, replaceActionId }); }
export function withdrawFromAction(actionId) { return call('withdrawVolunteer', { actionId }); }
export function getVolunteerDashboard() { return call('getVolunteerDashboard', {}); }

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
