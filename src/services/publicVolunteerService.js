import { getAuthService } from './firebaseAuth';
import { getFunctionsService } from './firebaseFunctions';

async function call(name, data) {
  const { functions, httpsCallable } = await getFunctionsService({ appCheck: true });
  return (await httpsCallable(functions, name)(data)).data;
}

export function listPublicActions(state) { return call('publicVolunteerActions', { state }); }
export function getPublicAction(actionId) { return call('publicVolunteerActions', { actionId }); }
export function enrollInAction(actionId, profile, replaceActionId = '') { return call('enrollVolunteer', { actionId, profile, replaceActionId }); }
export function withdrawFromAction(actionId) { return call('withdrawVolunteer', { actionId }); }

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
