import { getDbService } from './firebaseDb';
import { normalizeCoordinationContacts, publicCoordinationMetadata } from '../domain/coordinationContacts';

export async function subscribeCoordinationContacts(branchId, onChange, onError) {
  const { db, doc, onSnapshot } = await getDbService(['doc', 'onSnapshot']);
  return onSnapshot(doc(db, 'publicCoordinationContacts', branchId), snapshot => {
    onChange(snapshot.exists() ? snapshot.data() : null);
  }, onError);
}

export async function saveCoordinationContacts(branchId, input) {
  const contacts = normalizeCoordinationContacts(input);
  const { db, doc, getDoc, setDoc, serverTimestamp } = await getDbService(['doc', 'getDoc', 'setDoc', 'serverTimestamp']);
  const branch = await getDoc(doc(db, 'branches', branchId));
  if (!branch.exists()) throw new Error('Coordenação não encontrada.');
  // Explicit allowlist: never copy the responsible person's user profile.
  await setDoc(doc(db, 'publicCoordinationContacts', branchId), {
    ...publicCoordinationMetadata(branch.data()), ...contacts, updatedAt: serverTimestamp(),
  });
}
