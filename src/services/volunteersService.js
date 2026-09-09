import { createVolunteerRecords } from "../domain/volunteers/volunteerModel";
import { getDbService } from "./firebaseDb";

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
    ? query(collection(db, "volunteers"), where("branchId", "==", branchId))
    : collection(db, "volunteers");
  const snapshot = await getDocs(source);
  return snapshot.docs
    .map((item) => ({ id: item.id, ...item.data() }))
    .sort((a, b) => a.fullName.localeCompare(b.fullName, "pt-BR"));
}

export async function listVolunteersPage({ branchId = null, cursor = null, pageSize = 25 } = {}) {
  const safePageSize = Math.min(Math.max(Number(pageSize) || 25, 1), 100);
  const { db, collection, getDocs, limit, orderBy, query, startAfter, where } = await getDbService([
    "collection", "getDocs", "limit", "orderBy", "query", "startAfter", "where",
  ]);

  const constraints = [collection(db, "volunteers")];
  if (branchId) constraints.push(where("branchId", "==", branchId));
  constraints.push(orderBy("fullName"), limit(safePageSize + 1));
  if (cursor) constraints.push(startAfter(cursor));

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

export async function listVolunteerPrivate(branchId) {
  const { db, collection, getDocs, query, where } = await getDbService([
    "collection", "getDocs", "query", "where",
  ]);
  const snapshot = await getDocs(query(
    collection(db, "volunteerPrivate"),
    where("branchId", "==", branchId),
  ));
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
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
    email: records.publicData.email,
    phone: records.publicData.phone,
    status: records.publicData.status,
    updatedAt: timestamp,
  });
  batch.update(doc(db, "volunteerPrivate", id), {
    cpf: records.privateData.cpf,
    rg: records.privateData.rg,
    birthDate: records.privateData.birthDate,
    updatedAt: timestamp,
  });
  await batch.commit();
}

export async function updateVolunteerStatus(id, status) {
  const { db, doc, serverTimestamp, updateDoc } = await getDbService([
    "doc", "serverTimestamp", "updateDoc",
  ]);
  await updateDoc(doc(db, "volunteers", id), { status, updatedAt: serverTimestamp() });
}
