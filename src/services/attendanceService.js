import { getDbService } from './firebaseDb';

export async function listAttendance(actionId, branchId) {
  const { db, collection, getDocs, query, where } = await getDbService(['collection', 'getDocs', 'query', 'where']);
  const snapshot = await getDocs(query(collection(db, 'attendance'), where('actionId', '==', actionId), where('branchId', '==', branchId)));
  return new Set(snapshot.docs.filter(item => item.data().present).map(item => item.data().volunteerId));
}

export async function setVolunteerAttendance({ actionId, branchId, volunteerId, present }) {
  const { db, deleteDoc, doc, serverTimestamp, setDoc } = await getDbService(['deleteDoc', 'doc', 'serverTimestamp', 'setDoc']);
  const reference = doc(db, 'attendance', `${actionId}_${volunteerId}`);
  if (!present) return deleteDoc(reference);
  return setDoc(reference, { actionId, branchId, volunteerId, present: true, updatedAt: serverTimestamp() });
}

export async function getAttendanceSession(actionId) {
  const { db, doc, getDoc } = await getDbService(['doc', 'getDoc']);
  const snapshot = await getDoc(doc(db, 'attendanceSessions', actionId));
  return snapshot.exists() ? snapshot.data() : null;
}

export async function startAttendanceSession(actionId, branchId) {
  const { db, doc, serverTimestamp, setDoc } = await getDbService(['doc', 'serverTimestamp', 'setDoc']);
  await setDoc(doc(db, 'attendanceSessions', actionId), { actionId, branchId, startedAt: serverTimestamp() }, { merge: true });
}

export async function listMyAttendance(actionId, volunteerId) {
  const { db, doc, getDoc } = await getDbService(['doc', 'getDoc']);
  const snapshot = await getDoc(doc(db, 'attendance', `${actionId}_${volunteerId}`));
  return snapshot.exists() && snapshot.data().present === true;
}
