import { createVolunteerRecords } from "../domain/volunteers/volunteerModel";
import { getDbService } from "./firebaseDb";
import { normalizeSearchText } from '../../functions/contactFields.js';
import { getFunctionsService } from './firebaseFunctions';

async function callVolunteerAccess(action, volunteerId) {
  const { functions, httpsCallable } = await getFunctionsService();
  return (await httpsCallable(functions, 'manageVolunteerAccess')({ action, volunteerId })).data;
}

export async function listCoordinationActionVolunteers(input) {
  const { functions, httpsCallable } = await getFunctionsService();
  return (await httpsCallable(functions, 'listCoordinationActionVolunteers')(input)).data;
}

export async function createVolunteer(input) {
  const records = createVolunteerRecords(input);
  const { db, collection, doc, serverTimestamp, writeBatch } = await getDbService([
    "collection", "doc", "serverTimestamp", "writeBatch",
  ]);
  const volunteerRef = doc(collection(db, "volunteers"));
  const privateRef = doc(db, "volunteerPrivate", volunteerRef.id);
  const timestamp = serverTimestamp();
  const batch = writeBatch(db);

  batch.set(volunteerRef, { ...records.publicData, createdAt: timestamp, updatedAt: timestamp });
  batch.set(privateRef, {
    ...records.privateData,
    volunteerId: volunteerRef.id,
    createdAt: timestamp,
    updatedAt: timestamp,
  });
  await batch.commit();
  return volunteerRef.id;
}

export async function listVolunteers(branchId = null) {
  const { db, collection, getDocs, query, where } = await getDbService([
    "collection", "getDocs", "query", "where",
  ]);
  const source = branchId
    ? query(collection(db, "volunteers"), where("regionalIds", "array-contains", branchId))
    : collection(db, "volunteers");
  const snapshot = await getDocs(source);
  return snapshot.docs
    .map((item) => ({ id: item.id, ...item.data() }))
    .sort((a, b) => a.fullName.localeCompare(b.fullName, "pt-BR"));
}

export async function listVolunteersPage({ branchId = null, actionId = null, activeOnly = false, search = "", cursor = null, pageSize = 25 } = {}) {
  const safePageSize = Math.min(Math.max(Number(pageSize) || 25, 1), 100);
  const { db, collection, endAt, getDocs, limit, orderBy, query, startAfter, startAt, where } = await getDbService([
    "collection", "endAt", "getDocs", "limit", "orderBy", "query", "startAfter", "startAt", "where",
  ]);

  const constraints = [collection(db, "volunteers")];
  if (branchId) constraints.push(where("regionalIds", "array-contains", branchId));
  if (actionId) constraints.push(where("actionIds", "array-contains", actionId));
  if (activeOnly) constraints.push(where("status", "==", "active"));
  constraints.push(orderBy("fullNameSearch"));
  const term = normalizeSearchText(search);
  if (term) constraints.push(startAt(term), endAt(`${term}\uf8ff`));
  if (cursor) constraints.push(startAfter(cursor));
  constraints.push(limit(safePageSize + 1));

  const snapshot = await getDocs(query(...constraints));
  const documents = snapshot.docs.slice(0, safePageSize);
  const hasMore = snapshot.docs.length > safePageSize;

  return {
    data: documents.map((item) => ({ id: item.id, ...item.data() })),
    cursor: hasMore ? documents.at(-1) : null,
    hasMore,
  };
}

export async function getVolunteerPrivate(id) {
  const { db, doc, getDoc } = await getDbService(["doc", "getDoc"]);
  const snapshot = await getDoc(doc(db, "volunteerPrivate", id));
  if (!snapshot.exists()) throw new Error("Documentos pessoais não encontrados.");
  return snapshot.data();
}

export async function getVolunteer(id) {
  const { db, doc, getDoc } = await getDbService(['doc', 'getDoc']);
  const snapshot = await getDoc(doc(db, 'volunteers', id));
  if (!snapshot.exists()) throw new Error('Cadastro de voluntário não encontrado.');
  return { id: snapshot.id, ...snapshot.data() };
}

export async function updateVolunteer(id, input) {
  const records = createVolunteerRecords(input);
  const { db, doc, serverTimestamp, writeBatch } = await getDbService([
    "doc", "serverTimestamp", "writeBatch",
  ]);
  const timestamp = serverTimestamp();
  const batch = writeBatch(db);
  batch.update(doc(db, "volunteers", id), {
    fullName: records.publicData.fullName,
    fullNameSearch: records.publicData.fullNameSearch,
    email: records.publicData.email,
    phone: records.publicData.phone,
    actionIds: records.publicData.actionIds,
    regionalIds: records.publicData.regionalIds,
    participationDates: records.publicData.participationDates,
    status: records.publicData.status,
    updatedAt: timestamp,
  });
  batch.update(doc(db, "volunteerPrivate", id), {
    cpf: records.privateData.cpf, rg: records.privateData.rg, birthDate: records.privateData.birthDate,
    address: records.privateData.address, shirtSize: records.privateData.shirtSize, ngoRelationship: records.privateData.ngoRelationship,
    lgpdAccepted: records.privateData.lgpdAccepted, regulationAccepted: records.privateData.regulationAccepted,
    imageUseAccepted: records.privateData.imageUseAccepted, guardianAuthorizationAccepted: records.privateData.guardianAuthorizationAccepted,
    updatedAt: timestamp,
  });
  await batch.commit();
}

export async function listVolunteerReport({ branchId = 'all', actionId = 'all' } = {}) {
  const { db, collection, getDoc, getDocs, doc, query, where } = await getDbService([
    'collection', 'getDoc', 'getDocs', 'doc', 'query', 'where',
  ]);
  const volunteers = collection(db, 'volunteers');
  const snapshot = actionId !== 'all'
    ? await getDocs(query(volunteers, where('actionIds', 'array-contains', actionId)))
    : branchId !== 'all'
      ? await getDocs(query(volunteers, where('regionalIds', 'array-contains', branchId)))
      : await getDocs(volunteers);
  const rows = await Promise.all(snapshot.docs.map(async item => {
    const privateSnapshot = await getDoc(doc(db, 'volunteerPrivate', item.id));
    if (!privateSnapshot.exists()) return null;
    return { id: item.id, ...item.data(), ...privateSnapshot.data() };
  }));
  return rows.filter(Boolean).sort((a, b) => a.fullName.localeCompare(b.fullName, 'pt-BR'));
}

export async function updateVolunteerStatus(id, status) {
  return callVolunteerAccess(status === 'active' ? 'activate' : 'block', id);
}

export async function createVolunteerAccess(id) { return callVolunteerAccess('create', id); }
export async function resetVolunteerPassword(id) { return callVolunteerAccess('resetPassword', id); }

export async function deleteVolunteer(id) {
  return callVolunteerAccess('delete', id);
}
