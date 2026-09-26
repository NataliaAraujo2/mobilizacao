import { isValidEmail, isValidPhone, normalizeSearchText } from './contactFields.js';
import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { randomInt } from "node:crypto";
import { nextBranchViewerUsername } from "./viewerIdentity.js";

initializeApp();

export { manageLinkForms, publicLinkForms } from './formsFunctions.js';

const REGION = "southamerica-east1";
const VIEWER_ROLE = "branchViewer";
const VOLUNTEER_ROLE = "volunteer";
const BRAZIL_STATE_CODES = new Set('AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO'.split(' '));
const REPORT_YEAR = "2025";
const REPORT_PATH = `public-reports/${REPORT_YEAR}/report.pdf`;
const MAX_REPORT_SIZE = 25 * 1024 * 1024;
// Operações administrativas são pouco frequentes. Mantemos custo zero em
// repouso e impedimos escala inesperada por repetição acidental de chamadas.
const ADMIN_FUNCTION_OPTIONS = { region: REGION, minInstances: 0, maxInstances: 2, concurrency: 10 };
const PUBLIC_FUNCTION_OPTIONS = { ...ADMIN_FUNCTION_OPTIONS, enforceAppCheck: true };

function requireSuperAdmin(request) {
  if (!request.auth || request.auth.token.role !== "superAdmin" || request.auth.token.status !== "active") {
    throw new HttpsError("permission-denied", "Apenas o superAdmin pode executar esta operação.");
  }
}

function actionPhase(action, now = new Date()) {
  const startDate = action.startDate || action.date;
  const endDate = action.endDate || startDate;
  const start = new Date(`${startDate}T${action.startTime || '00:00'}:00-03:00`);
  const end = new Date(`${endDate}T${action.endTime || '23:59'}:00-03:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 'planning';
  if (now < start) return 'planning';
  if (now <= end) return 'ongoing';
  return 'completed';
}

function isMinorBirthDate(birthDate, today = new Date()) {
  const birth = new Date(`${birthDate}T00:00:00-03:00`);
  if (Number.isNaN(birth.getTime())) return false;
  let age = today.getFullYear() - birth.getFullYear();
  if (today < new Date(today.getFullYear(), birth.getMonth(), birth.getDate())) age -= 1;
  return age < 18;
}

function requiredText(value, field, min = 2, max = 120) {
  if (typeof value !== "string" || value.trim().length < min || value.trim().length > max) {
    throw new HttpsError("invalid-argument", `Campo inválido: ${field}.`);
  }
  return value.trim();
}

function generateFriendlyPassword() {
  const words = [
    "Agua", "Amor", "Anjo", "Arco", "Areia", "Azul", "Bela", "Brisa",
    "Caju", "Campo", "Casa", "Ceu", "Chuva", "Doce", "Estrela", "Feliz",
    "Flor", "Folha", "Fonte", "Fruta", "Gato", "Ilha", "Jardim", "Lago",
    "Leve", "Lima", "Lua", "Luz", "Manga", "Mar", "Mel", "Nuvem",
    "Onda", "Paz", "Pedra", "Peixe", "Ponte", "Praia", "Raio", "Rede",
    "Rio", "Rosa", "Sabia", "Serra", "Sol", "Sonho", "Terra", "Trigo",
    "Vale", "Vela", "Verde", "Vida", "Vila", "Vinho", "Violeta", "Voa",
  ];
  const selected = [];
  while (selected.length < 3) {
    const word = words[randomInt(words.length)];
    if (!selected.includes(word)) selected.push(word);
  }
  return `${selected.join("-")}-${randomInt(10, 100)}`;
}

function digits(value) { return String(value ?? '').replace(/\D/g, ''); }
function validCpf(value) {
  const cpf = digits(value);
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
  for (let size = 9; size <= 10; size += 1) {
    let sum = 0;
    for (let index = 0; index < size; index += 1) sum += Number(cpf[index]) * (size + 1 - index);
    if ((sum * 10) % 11 % 10 !== Number(cpf[size])) return false;
  }
  return true;
}

function publicVolunteerProfile(profile) {
  const fullName = requiredText(profile.fullName, 'nome', 2, 120);
  const email = String(profile.email ?? '').trim().toLowerCase();
  const phone = digits(profile.phone);
  const cpf = digits(profile.cpf);
  const rg = requiredText(profile.rg, 'RG', 3, 20).toUpperCase().replace(/[^0-9A-Z]/g, '');
  const birthDate = requiredText(profile.birthDate, 'nascimento', 10, 10);
  const addressInput = profile.address ?? {};
  const address = { cep: digits(addressInput.cep), street: String(addressInput.street ?? '').trim(), number: String(addressInput.number ?? '').trim(), complement: String(addressInput.complement ?? '').trim(), neighborhood: String(addressInput.neighborhood ?? '').trim(), city: requiredText(addressInput.city, 'cidade', 2, 120), state: requiredText(addressInput.state, 'estado', 2, 2).toUpperCase() };
  const shirtSize = requiredText(profile.shirtSize, 'tamanho da camiseta', 1, 10).toUpperCase();
  const ngoRelationship = requiredText(profile.ngoRelationship, 'vínculo com a ONG', 2, 120);
  if (!isValidEmail(email)) throw new HttpsError('invalid-argument', 'E-mail inválido.');
  if (!validCpf(cpf)) throw new HttpsError('invalid-argument', 'CPF inválido.');
  if (!isValidPhone(phone, 13)) throw new HttpsError('invalid-argument', 'Telefone inválido.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) throw new HttpsError('invalid-argument', 'Data de nascimento inválida.');
  if (!BRAZIL_STATE_CODES.has(address.state) || !['PP', 'P', 'M', 'G', 'GG', 'XG'].includes(shirtSize) || !['Comunidade ou Projeto local', 'Empregado ou Aposentado da CAIXA', 'Indicação de amigos ou família'].includes(ngoRelationship) || profile.lgpdAccepted !== true || profile.regulationAccepted !== true || profile.imageUseAccepted !== true || (isMinorBirthDate(birthDate) && profile.guardianAuthorizationAccepted !== true)) throw new HttpsError('invalid-argument', 'Dados complementares ou autorizações do voluntário inválidos.');
  return { fullName, email, phone, cpf, rg, birthDate, address, shirtSize, ngoRelationship, guardianAuthorizationAccepted: profile.guardianAuthorizationAccepted === true };
}

export const listCoordinationActionVolunteers = onCall(ADMIN_FUNCTION_OPTIONS, async (request) => {
  if (!request.auth || request.auth.token.status !== 'active' || !['superAdmin', VIEWER_ROLE].includes(request.auth.token.role)) {
    throw new HttpsError('permission-denied', 'Acesso não autorizado.');
  }
  const actionId = requiredText(request.data?.actionId, 'actionId', 1, 128);
  if (actionId.includes('/')) throw new HttpsError('invalid-argument', 'Ação inválida.');
  const db = getFirestore();
  const action = await db.collection('actions').doc(actionId).get();
  if (!action.exists || (request.auth.token.role !== 'superAdmin' && action.data().branchId !== request.auth.token.branchId)) {
    throw new HttpsError('permission-denied', 'Esta ação não pertence à sua coordenação estadual.');
  }
  const pageSize = Math.floor(Math.min(100, Math.max(1, Number(request.data?.pageSize) || 10)));
  const search = normalizeSearchText(String(request.data?.search ?? '').slice(0, 120));
  let query = db.collection('volunteers').where('actionIds', 'array-contains', actionId).where('status', '==', 'active').orderBy('fullNameSearch').orderBy('__name__');
  if (search) query = query.startAt(search).endAt(`${search}\uf8ff`);
  const cursor = request.data?.cursor;
  if (cursor) {
    if (typeof cursor.name !== 'string' || typeof cursor.id !== 'string' || !cursor.id || cursor.id.includes('/')) throw new HttpsError('invalid-argument', 'Página inválida.');
    query = query.startAfter(cursor.name, cursor.id);
  }
  const snapshot = await query.limit(pageSize + 1).get();
  const docs = snapshot.docs.slice(0, pageSize);
  const last = docs.at(-1);
  return {
    data: docs.map(doc => ({ id: doc.id, fullName: doc.data().fullName })),
    hasMore: snapshot.size > pageSize,
    cursor: snapshot.size > pageSize ? { name: last.data().fullNameSearch, id: last.id } : null,
  };
});

export const enrollVolunteer = onCall(PUBLIC_FUNCTION_OPTIONS, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Entre ou crie uma conta para participar.');
  const actionId = requiredText(request.data?.actionId, 'actionId', 1, 128);
  const db = getFirestore();
  const actionSnapshot = await db.collection('actions').doc(actionId).get();
  if (!actionSnapshot.exists) throw new HttpsError('not-found', 'A ação não existe.');
  const action = actionSnapshot.data();
  if (actionPhase(action) === 'completed') throw new HttpsError('failed-precondition', 'As inscrições desta ação foram encerradas.');
  const volunteerRef = db.collection('volunteers').doc(request.auth.uid);
  const existing = await volunteerRef.get();
  if (existing.exists) {
    if (request.auth.token.role !== VOLUNTEER_ROLE) throw new HttpsError('permission-denied', 'Esta conta não é de voluntário.');
    await db.runTransaction(async transaction => {
      const current = await transaction.get(volunteerRef);
      const data = current.data();
      if (data.actionIds?.includes(actionId)) return;
      const conflictIndex = (data.participationDates ?? []).indexOf(action.date);
      const conflictId = conflictIndex >= 0 ? data.actionIds?.[conflictIndex] : null;
      const replaceActionId = String(request.data?.replaceActionId ?? '');
      if (conflictId && replaceActionId !== conflictId) {
        const conflictSnapshot = await transaction.get(db.collection('actions').doc(conflictId));
        throw new HttpsError('already-exists', 'Você já está inscrito em uma ação nesta data.', { conflictActionId: conflictId, conflictActionName: conflictSnapshot.exists ? conflictSnapshot.data().name : 'outra ação', newActionName: action.name });
      }
      const nextActionIds = conflictId ? data.actionIds.map(id => id === conflictId ? actionId : id) : [...(data.actionIds ?? []), actionId];
      const actionSnapshots = await transaction.getAll(...nextActionIds.map(id => db.collection('actions').doc(id)));
      const regionalIds = [...new Set(actionSnapshots.filter(item => item.exists).map(item => item.data().branchId))];
      const participationDates = actionSnapshots.filter(item => item.exists).map(item => item.data().date);
      if (new Set(participationDates).size !== participationDates.length) throw new HttpsError('already-exists', 'Só é permitida uma ação por dia.');
      transaction.update(volunteerRef, { actionIds: nextActionIds, regionalIds, participationDates, updatedAt: FieldValue.serverTimestamp() });
    });
    return { created: false, replaced: Boolean(request.data?.replaceActionId) };
  }
  const profile = request.data?.profile ?? {};
  const fullName = requiredText(profile.fullName, 'nome', 2, 120);
  const email = String(request.auth.token.email ?? '').toLowerCase();
  const phone = digits(profile.phone);
  const cpf = digits(profile.cpf);
  const rg = requiredText(profile.rg, 'RG', 3, 20).toUpperCase().replace(/[^0-9A-Z]/g, '');
  const birthDate = requiredText(profile.birthDate, 'nascimento', 10, 10);
  const addressInput = profile.address ?? {};
  const address = { cep: digits(addressInput.cep), street: String(addressInput.street ?? '').trim(), number: String(addressInput.number ?? '').trim(), complement: String(addressInput.complement ?? '').trim(), neighborhood: String(addressInput.neighborhood ?? '').trim(), city: requiredText(addressInput.city, 'cidade', 2, 120), state: requiredText(addressInput.state, 'estado', 2, 2).toUpperCase() };
  const shirtSize = requiredText(profile.shirtSize, 'tamanho da camiseta', 1, 10).toUpperCase();
  const ngoRelationship = requiredText(profile.ngoRelationship, 'vínculo com a ONG', 2, 120);
  if (!validCpf(cpf)) throw new HttpsError('invalid-argument', 'CPF inválido.');
  if (!isValidPhone(phone, 13)) throw new HttpsError('invalid-argument', 'Telefone inválido.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) throw new HttpsError('invalid-argument', 'Data de nascimento inválida.');
  if (!BRAZIL_STATE_CODES.has(address.state) || !['PP', 'P', 'M', 'G', 'GG', 'XG'].includes(shirtSize) || !['Comunidade ou Projeto local', 'Empregado ou Aposentado da CAIXA', 'Indicação de amigos ou família'].includes(ngoRelationship) || profile.lgpdAccepted !== true || profile.regulationAccepted !== true || profile.imageUseAccepted !== true || (isMinorBirthDate(birthDate) && profile.guardianAuthorizationAccepted !== true)) throw new HttpsError('invalid-argument', 'Dados complementares ou autorizações do voluntário inválidos.');
  const duplicateCpf = await db.collection('volunteerPrivate').where('cpf', '==', cpf).limit(1).get();
  if (!duplicateCpf.empty) throw new HttpsError('already-exists', 'Este CPF já possui cadastro. Entre com sua conta ou solicite nova senha.');
  const batch = db.batch();
  batch.set(volunteerRef, { fullName, fullNameSearch: normalizeSearchText(fullName), email, phone, actionIds: [actionId], regionalIds: [action.branchId], participationDates: [action.date], status: 'active', accessStatus: 'active', createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() });
  batch.set(db.collection('volunteerPrivate').doc(request.auth.uid), { volunteerId: request.auth.uid, cpf, rg, birthDate, address, shirtSize, ngoRelationship, lgpdAccepted: true, regulationAccepted: true, imageUseAccepted: true, guardianAuthorizationAccepted: profile.guardianAuthorizationAccepted === true, createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() });
  await batch.commit();
  await getAuth().updateUser(request.auth.uid, { displayName: fullName });
  await getAuth().setCustomUserClaims(request.auth.uid, { role: VOLUNTEER_ROLE, status: 'active' });
  return { created: true };
});

// Cadastro público: dados pessoais nunca são gravados diretamente pelo navegador.
// O App Check protege o endpoint e a Function valida todas as autorizações.
export const registerPublicVolunteer = onCall(PUBLIC_FUNCTION_OPTIONS, async (request) => {
  const actionId = requiredText(request.data?.actionId, 'actionId', 1, 128);
  const db = getFirestore();
  const actionSnapshot = await db.collection('actions').doc(actionId).get();
  if (!actionSnapshot.exists) throw new HttpsError('not-found', 'A ação não existe.');
  const action = actionSnapshot.data();
  if (actionPhase(action) === 'completed') throw new HttpsError('failed-precondition', 'As inscrições desta ação foram encerradas.');
  const profile = publicVolunteerProfile(request.data?.profile ?? {});
  const duplicateCpf = await db.collection('volunteerPrivate').where('cpf', '==', profile.cpf).limit(1).get();
  if (!duplicateCpf.empty) throw new HttpsError('already-exists', 'Este CPF já possui cadastro. Procure a coordenação caso precise atualizar sua inscrição.');
  const volunteerRef = db.collection('volunteers').doc();
  const batch = db.batch();
  batch.set(volunteerRef, { fullName: profile.fullName, fullNameSearch: normalizeSearchText(profile.fullName), email: profile.email, phone: profile.phone, actionIds: [actionId], regionalIds: [action.branchId], participationDates: [action.date], status: 'active', accessStatus: 'none', createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() });
  batch.set(db.collection('volunteerPrivate').doc(volunteerRef.id), { volunteerId: volunteerRef.id, cpf: profile.cpf, rg: profile.rg, birthDate: profile.birthDate, address: profile.address, shirtSize: profile.shirtSize, ngoRelationship: profile.ngoRelationship, lgpdAccepted: true, regulationAccepted: true, imageUseAccepted: true, guardianAuthorizationAccepted: profile.guardianAuthorizationAccepted, createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() });
  await batch.commit();
  return { created: true };
});

// A coordenação pode cadastrar voluntários da própria UF, porém os documentos
// pessoais seguem sendo gravados apenas pela Function e nunca retornam a ela.
export const createCoordinationVolunteer = onCall(ADMIN_FUNCTION_OPTIONS, async (request) => {
  const isSuperAdmin = request.auth?.token.role === 'superAdmin' && request.auth.token.status === 'active';
  const isBranchViewer = request.auth?.token.role === VIEWER_ROLE && request.auth.token.status === 'active' && request.auth.token.branchId;
  if (!isSuperAdmin && !isBranchViewer) throw new HttpsError('permission-denied', 'Acesso não autorizado.');
  const profile = publicVolunteerProfile(request.data ?? {});
  const actionIds = [...new Set(Array.isArray(request.data?.actionIds) ? request.data.actionIds.map((id) => String(id).trim()).filter(Boolean) : [])];
  if (actionIds.length < 1 || actionIds.length > 20 || actionIds.some((id) => id.includes('/'))) throw new HttpsError('invalid-argument', 'Selecione de uma a vinte ações válidas.');
  const db = getFirestore();
  const actionSnapshots = await db.getAll(...actionIds.map((id) => db.collection('actions').doc(id)));
  if (actionSnapshots.some((item) => !item.exists)) throw new HttpsError('not-found', 'Uma das ações selecionadas não existe.');
  const actions = actionSnapshots.map((item) => item.data());
  if (isBranchViewer && actions.some((action) => action.branchId !== request.auth.token.branchId)) throw new HttpsError('permission-denied', 'A coordenação só pode cadastrar voluntários nas próprias ações.');
  const participationDates = actions.map((action) => action.date);
  if (new Set(participationDates).size !== participationDates.length) throw new HttpsError('already-exists', 'O voluntário só pode participar de uma ação por dia.');
  const duplicateCpf = await db.collection('volunteerPrivate').where('cpf', '==', profile.cpf).limit(1).get();
  if (!duplicateCpf.empty) throw new HttpsError('already-exists', 'Este CPF já possui cadastro.');
  const volunteerRef = db.collection('volunteers').doc();
  const batch = db.batch();
  batch.set(volunteerRef, { fullName: profile.fullName, fullNameSearch: normalizeSearchText(profile.fullName), email: profile.email, phone: profile.phone, actionIds, regionalIds: [...new Set(actions.map((action) => action.branchId))], participationDates, status: 'active', accessStatus: 'none', createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() });
  batch.set(db.collection('volunteerPrivate').doc(volunteerRef.id), { volunteerId: volunteerRef.id, cpf: profile.cpf, rg: profile.rg, birthDate: profile.birthDate, address: profile.address, shirtSize: profile.shirtSize, ngoRelationship: profile.ngoRelationship, lgpdAccepted: true, regulationAccepted: true, imageUseAccepted: true, guardianAuthorizationAccepted: profile.guardianAuthorizationAccepted, createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() });
  await batch.commit();
  return { id: volunteerRef.id };
});

export const withdrawVolunteer = onCall(PUBLIC_FUNCTION_OPTIONS, async (request) => {
  if (!request.auth || request.auth.token.role !== VOLUNTEER_ROLE || request.auth.token.status !== 'active') throw new HttpsError('permission-denied', 'Acesso de voluntário necessário.');
  const actionId = requiredText(request.data?.actionId, 'actionId', 1, 128);
  const db = getFirestore();
  const volunteerRef = db.collection('volunteers').doc(request.auth.uid);
  const actionRef = db.collection('actions').doc(actionId);
  await db.runTransaction(async transaction => {
    const [volunteerSnapshot, actionSnapshot] = await Promise.all([transaction.get(volunteerRef), transaction.get(actionRef)]);
    if (!volunteerSnapshot.exists || !actionSnapshot.exists) throw new HttpsError('not-found', 'Inscrição não encontrada.');
    const action = actionSnapshot.data();
    const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' });
    if (action.date <= today) throw new HttpsError('failed-precondition', 'A participação só pode ser cancelada antes do dia da ação.');
    const remainingIds = (volunteerSnapshot.data().actionIds ?? []).filter(id => id !== actionId);
    const remainingSnapshots = remainingIds.length ? await transaction.getAll(...remainingIds.map(id => db.collection('actions').doc(id))) : [];
    const regionalIds = [...new Set(remainingSnapshots.filter(item => item.exists).map(item => item.data().branchId))];
    const participationDates = [...new Set(remainingSnapshots.filter(item => item.exists).map(item => item.data().date))];
    transaction.update(volunteerRef, { actionIds: remainingIds, regionalIds, participationDates, updatedAt: FieldValue.serverTimestamp() });
  });
  return { ok: true };
});

export const getVolunteerDashboard = onCall(PUBLIC_FUNCTION_OPTIONS, async (request) => {
  if (!request.auth || request.auth.token.role !== VOLUNTEER_ROLE || request.auth.token.status !== 'active') {
    throw new HttpsError('permission-denied', 'Acesso de voluntário necessário.');
  }
  const db = getFirestore();
  const volunteerSnapshot = await db.collection('volunteers').doc(request.auth.uid).get();
  if (!volunteerSnapshot.exists) throw new HttpsError('not-found', 'Cadastro de voluntário não encontrado.');
  const volunteer = volunteerSnapshot.data();
  const actionIds = [...new Set(volunteer.actionIds ?? [])].filter(Boolean).slice(0, 20);
  const actionSnapshots = actionIds.length ? await db.getAll(...actionIds.map((id) => db.collection('actions').doc(id))) : [];
  const actions = actionSnapshots.filter((item) => item.exists).map((item) => ({ id: item.id, ...item.data() }));
  const sessionSnapshots = actions.length ? await db.getAll(...actions.map((action) => db.collection('attendanceSessions').doc(action.id))) : [];
  const attendanceSnapshots = actions.length ? await db.getAll(...actions.map((action) => db.collection('attendance').doc(`${action.id}_${request.auth.uid}`))) : [];
  return {
    volunteer: { id: volunteerSnapshot.id, fullName: volunteer.fullName },
    actions,
    sessionActionIds: sessionSnapshots.filter((item) => item.exists).map((item) => item.id),
    presentActionIds: attendanceSnapshots.filter((item) => item.exists && item.data().present === true).map((item) => item.data().actionId),
  };
});

export const confirmVolunteerAttendance = onCall(PUBLIC_FUNCTION_OPTIONS, async (request) => {
  if (!request.auth || request.auth.token.role !== VOLUNTEER_ROLE || request.auth.token.status !== 'active') {
    throw new HttpsError('permission-denied', 'Entre com sua conta de voluntário para confirmar a presença.');
  }
  const actionId = requiredText(request.data?.actionId, 'actionId', 1, 128);
  if (actionId.includes('/')) throw new HttpsError('invalid-argument', 'Ação inválida.');
  const db = getFirestore();
  const [actionSnapshot, volunteerSnapshot] = await Promise.all([
    db.collection('actions').doc(actionId).get(),
    db.collection('volunteers').doc(request.auth.uid).get(),
  ]);
  if (!actionSnapshot.exists || !volunteerSnapshot.exists) throw new HttpsError('not-found', 'Ação ou cadastro de voluntário não encontrado.');
  const action = actionSnapshot.data();
  const volunteer = volunteerSnapshot.data();
  if (volunteer.status !== 'active' || !(volunteer.actionIds ?? []).includes(actionId)) {
    throw new HttpsError('permission-denied', 'Sua conta não está inscrita nesta ação.');
  }
  if (actionPhase(action) !== 'ongoing') {
    throw new HttpsError('failed-precondition', 'A presença pode ser confirmada somente durante o horário da ação.');
  }
  const attendanceRef = db.collection('attendance').doc(`${actionId}_${request.auth.uid}`);
  const sessionRef = db.collection('attendanceSessions').doc(actionId);
  const batch = db.batch();
  batch.set(sessionRef, { actionId, branchId: action.branchId, startedAt: FieldValue.serverTimestamp() }, { merge: true });
  batch.set(attendanceRef, { actionId, branchId: action.branchId, volunteerId: request.auth.uid, present: true, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
  await batch.commit();
  return { ok: true, actionName: action.name };
});

export const backfillPublicActions = onCall(ADMIN_FUNCTION_OPTIONS, async (request) => {
  requireSuperAdmin(request);
  const db = getFirestore();
  const [branchesSnapshot, actionsSnapshot] = await Promise.all([db.collection('branches').get(), db.collection('actions').get()]);
  const branches = new Map(branchesSnapshot.docs.map((item) => [item.id, item.data()]));
  let updated = 0;
  let batch = db.batch();
  let inBatch = 0;
  for (const action of actionsSnapshot.docs) {
    const branch = branches.get(action.data().branchId);
    if (!branch?.state) continue;
    const coordinationState = String(branch.state).toUpperCase();
    if (action.data().coordinationState === coordinationState && action.data().publicVisible === true) continue;
    batch.update(action.ref, { coordinationState, publicVisible: branch.status === 'active', updatedAt: FieldValue.serverTimestamp() });
    updated += 1;
    inBatch += 1;
    if (inBatch === 450) { await batch.commit(); batch = db.batch(); inBatch = 0; }
  }
  if (inBatch) await batch.commit();
  return { ok: true, updated };
});

async function getBranch(branchId) {
  const snapshot = await getFirestore().collection("branches").doc(branchId).get();
  if (!snapshot.exists) throw new HttpsError("not-found", "A coordenação estadual informada não existe.");
  return snapshot;
}

async function nextBranchViewerIdentity(code, state, reservedUsernames = new Set()) {
  const snapshot = await getFirestore().collection("users").where("role", "==", VIEWER_ROLE).get();
  const identity = nextBranchViewerUsername(code, state, snapshot.docs.map((item) => item.data().displayName), reservedUsernames);
  return identity;
}

export const resolveBranchViewerLogin = onCall({ region: REGION, minInstances: 0, maxInstances: 2, concurrency: 20 }, async (request) => {
  const identity = requiredText(request.data?.identity, "identity", 2, 160);
  const byEmail = identity.includes("@");
  const value = byEmail ? identity.toLowerCase() : identity.toUpperCase();
  const field = byEmail ? "contactEmail" : "displayName";
  const snapshot = await getFirestore().collection("users").where(field, "==", value).limit(5).get();
  const profile = snapshot.docs.find((item) => item.data().role === VIEWER_ROLE);
  return { email: profile?.data().email ?? null };
});

export const createBranchViewer = onCall(ADMIN_FUNCTION_OPTIONS, async (request) => {
  requireSuperAdmin(request);

  const branchId = requiredText(request.data?.branchId, "branchId", 1, 80);
  const contactName = requiredText(request.data?.contactName, "contactName", 2, 120);
  const contactEmail = requiredText(request.data?.contactEmail, "contactEmail", 5, 160).toLowerCase();
  const contactPhone = requiredText(request.data?.contactPhone, "contactPhone", 10, 20).replace(/\D/g, "");
  if (!isValidEmail(contactEmail)) {
    throw new HttpsError("invalid-argument", "E-mail de contato inválido.");
  }
  if (!isValidPhone(contactPhone, 13)) {
    throw new HttpsError("invalid-argument", "Telefone de contato inválido.");
  }
  const branch = await getBranch(branchId);
  const state = requiredText(branch.data().state, "state", 2, 2).toUpperCase();
  const code = requiredText(branch.data().code, "code", 1, 40);
  const auth = getAuth();
  const db = getFirestore();
  const reservedUsernames = new Set();

  // Duas solicitações simultâneas para a mesma UF podem escolher o mesmo
  // sufixo. Em caso de colisão de e-mail, tentamos o próximo identificador;
  // nunca excluímos uma conta que já existia.
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const { username, coordinationNumber, userNumber } = await nextBranchViewerIdentity(code, state, reservedUsernames);
    const password = generateFriendlyPassword();
    let createdAuthUser = null;
    try {
      createdAuthUser = await auth.createUser({ displayName: username, email: contactEmail, password });
      const uid = createdAuthUser.uid;
      await auth.setCustomUserClaims(uid, { role: VIEWER_ROLE, branchId, status: "active", mustChangePassword: true });
      await db.collection("users").doc(uid).set({
        displayName: username,
        email: contactEmail,
        role: VIEWER_ROLE,
        branchId,
        contactName,
        contactNameSearch: normalizeSearchText(contactName),
        contactEmail,
        contactPhone,
        coordinationNumber,
        userNumber,
        status: "active",
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
      return { uid, username, password, coordinationNumber, userNumber };
    } catch (error) {
      // Só remove a conta criada por esta própria tentativa após uma falha
      // posterior. Conflitos nunca excluem uma conta que já existia.
      if (createdAuthUser) await auth.deleteUser(createdAuthUser.uid).catch(() => {});
      if (error.code === "auth/email-already-exists") throw new HttpsError("already-exists", "Este e-mail de contato já possui uma conta.");
      throw new HttpsError("internal", "Não foi possível gerar o acesso de consulta.");
    }
  }
  throw new HttpsError("resource-exhausted", "Não foi possível gerar um identificador único. Tente novamente.");
});

export const createSuperAdmin = onCall(ADMIN_FUNCTION_OPTIONS, async (request) => {
  requireSuperAdmin(request);
  const displayName = requiredText(request.data?.displayName, "displayName", 2, 120);
  const email = requiredText(request.data?.email, "email", 5, 160).toLowerCase();
  if (!isValidEmail(email)) throw new HttpsError("invalid-argument", "E-mail inválido.");
  const password = generateFriendlyPassword();
  const auth = getAuth();
  let created;
  try {
    created = await auth.createUser({ displayName, email, password });
    await auth.setCustomUserClaims(created.uid, { role: "superAdmin", status: "active", mustChangePassword: true });
    await getFirestore().collection("users").doc(created.uid).set({ displayName, email, role: "superAdmin", status: "active", createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() });
    return { uid: created.uid, email, displayName, password };
  } catch (error) {
    if (created?.uid) await auth.deleteUser(created.uid).catch(() => {});
    if (error.code === "auth/email-already-exists") throw new HttpsError("already-exists", "Este e-mail já possui uma conta.");
    throw new HttpsError("internal", "Não foi possível criar o superAdmin.");
  }
});

export const deleteSuperAdmin = onCall(ADMIN_FUNCTION_OPTIONS, async (request) => {
  requireSuperAdmin(request);
  const uid = requiredText(request.data?.uid, "uid", 1, 128);
  if (uid.includes("/")) throw new HttpsError("invalid-argument", "Identificador inválido.");
  if (uid === request.auth.uid) {
    throw new HttpsError("failed-precondition", "Você não pode excluir o próprio acesso.");
  }

  const profileRef = getFirestore().collection("users").doc(uid);
  const profile = await profileRef.get();
  if (!profile.exists || profile.data().role !== "superAdmin") {
    throw new HttpsError("not-found", "Superadmin não encontrado.");
  }

  try {
    await getAuth().deleteUser(uid);
  } catch (error) {
    if (error.code !== "auth/user-not-found") {
      throw new HttpsError("internal", "Não foi possível excluir o acesso. Tente novamente.");
    }
  }
  await profileRef.delete();
  return { ok: true };
});

export const updateSuperAdmin = onCall(ADMIN_FUNCTION_OPTIONS, async (request) => {
  requireSuperAdmin(request);
  const uid = requiredText(request.data?.uid, 'uid', 1, 128);
  if (uid.includes('/')) throw new HttpsError('invalid-argument', 'Identificador inválido.');
  const displayName = requiredText(request.data?.displayName, 'nome', 2, 120);
  const email = requiredText(request.data?.email, 'e-mail', 5, 160).toLowerCase();
  if (!isValidEmail(email)) throw new HttpsError('invalid-argument', 'E-mail inválido.');
  const profileRef = getFirestore().collection('users').doc(uid);
  const profile = await profileRef.get();
  if (!profile.exists || profile.data().role !== 'superAdmin') throw new HttpsError('not-found', 'Superadmin não encontrado.');
  try {
    await getAuth().updateUser(uid, { displayName, email });
  } catch (error) {
    if (error.code === 'auth/email-already-exists') throw new HttpsError('already-exists', 'Este e-mail já possui uma conta.');
    throw new HttpsError('internal', 'Não foi possível atualizar o superadmin.');
  }
  await profileRef.update({ displayName, email, updatedAt: FieldValue.serverTimestamp() });
  return { uid, displayName, email };
});

export const resetSuperAdminPassword = onCall(ADMIN_FUNCTION_OPTIONS, async (request) => {
  requireSuperAdmin(request);
  const uid = requiredText(request.data?.uid, 'uid', 1, 128);
  if (uid.includes('/')) throw new HttpsError('invalid-argument', 'Identificador inválido.');
  const profile = await getFirestore().collection('users').doc(uid).get();
  if (!profile.exists || profile.data().role !== 'superAdmin') throw new HttpsError('not-found', 'Superadmin não encontrado.');
  const password = generateFriendlyPassword();
  try {
    await getAuth().updateUser(uid, { password });
    await getAuth().setCustomUserClaims(uid, { role: 'superAdmin', status: 'active', mustChangePassword: true });
  } catch {
    throw new HttpsError('internal', 'Não foi possível gerar uma nova senha.');
  }
  await profile.ref.update({ updatedAt: FieldValue.serverTimestamp() });
  return { uid, displayName: profile.data().displayName, email: profile.data().email, password };
});

// Reaplica as permissões do Auth a partir do cadastro administrativo. Isso evita
// divergência entre o documento exibido no painel e o token usado pelo Storage.
export const syncSuperAdminClaims = onCall(ADMIN_FUNCTION_OPTIONS, async (request) => {
  requireSuperAdmin(request);
  const db = getFirestore();
  const auth = getAuth();
  const snapshot = await db.collection('users').where('role', '==', 'superAdmin').get();
  const synced = [];
  const missingAuthUsers = [];

  for (const profile of snapshot.docs) {
    try {
      const account = await auth.getUser(profile.id);
      const currentClaims = account.customClaims ?? {};
      const claims = { ...currentClaims, role: 'superAdmin', status: profile.data().status === 'blocked' ? 'blocked' : 'active' };
      await auth.setCustomUserClaims(profile.id, claims);
      synced.push({ uid: profile.id, email: account.email ?? profile.data().email ?? '' });
    } catch (error) {
      if (error.code === 'auth/user-not-found') {
        missingAuthUsers.push({ uid: profile.id, email: profile.data().email ?? '' });
        continue;
      }
      throw new HttpsError('internal', 'Não foi possível sincronizar as permissões dos superadmins.');
    }
  }
  return { synced, missingAuthUsers };
});

export const completeSuperAdminPasswordChange = onCall(ADMIN_FUNCTION_OPTIONS, async (request) => {
  const { role, status, branchId, mustChangePassword } = request.auth?.token ?? {};
  if (!request.auth || !["superAdmin", VIEWER_ROLE].includes(role) || status !== "active" || !mustChangePassword) {
    throw new HttpsError("permission-denied", "Acesso negado.");
  }
  const password = request.data?.password;
  if (typeof password !== "string" || password.length < 6) {
    throw new HttpsError("invalid-argument", "A senha precisa ter pelo menos 6 caracteres.");
  }
  await getAuth().updateUser(request.auth.uid, { password });
  await getAuth().setCustomUserClaims(request.auth.uid, { role, status, ...(role === VIEWER_ROLE ? { branchId } : {}), mustChangePassword: false });
  return { ok: true };
});

export const updateBranchViewer = onCall(ADMIN_FUNCTION_OPTIONS, async (request) => {
  requireSuperAdmin(request);
  const uid = requiredText(request.data?.uid, "uid", 1, 128);
  const status = request.data?.status;
  if (!["active", "blocked"].includes(status)) throw new HttpsError("invalid-argument", "Situação inválida.");

  const profile = await getFirestore().collection("users").doc(uid).get();
  if (!profile.exists || profile.data().role !== VIEWER_ROLE) {
    throw new HttpsError("not-found", "Acesso de consulta não encontrado.");
  }
  const { branchId } = profile.data();
  await getAuth().setCustomUserClaims(uid, { role: VIEWER_ROLE, branchId, status });
  await getAuth().updateUser(uid, { disabled: status === "blocked" });
  await profile.ref.update({ status, updatedAt: FieldValue.serverTimestamp() });
  return { uid, status };
});

export const updateBranchViewerContact = onCall(ADMIN_FUNCTION_OPTIONS, async (request) => {
  requireSuperAdmin(request);
  const uid = requiredText(request.data?.uid, "uid", 1, 128);
  const contactName = requiredText(request.data?.contactName, "contactName", 2, 120);
  const contactEmail = requiredText(request.data?.contactEmail, "contactEmail", 5, 160).toLowerCase();
  const contactPhone = requiredText(request.data?.contactPhone, "contactPhone", 10, 20).replace(/\D/g, "");
  if (!isValidEmail(contactEmail) || !isValidPhone(contactPhone, 13)) {
    throw new HttpsError("invalid-argument", "Dados de contato inválidos.");
  }
  const profile = await getFirestore().collection("users").doc(uid).get();
  if (!profile.exists || profile.data().role !== VIEWER_ROLE) {
    throw new HttpsError("not-found", "Acesso da coordenação estadual não encontrado.");
  }
  try {
    await getAuth().updateUser(uid, { email: contactEmail });
  } catch (error) {
    if (error.code === "auth/email-already-exists") throw new HttpsError("already-exists", "Este e-mail de contato já possui uma conta.");
    throw new HttpsError("internal", "Não foi possível atualizar o e-mail de acesso.");
  }
  await profile.ref.update({ contactName, contactNameSearch: normalizeSearchText(contactName), contactEmail, contactPhone, email: contactEmail, updatedAt: FieldValue.serverTimestamp() });
  return { uid, contactName, contactEmail, contactPhone };
});

export const deleteBranchViewer = onCall(ADMIN_FUNCTION_OPTIONS, async (request) => {
  requireSuperAdmin(request);
  const uid = requiredText(request.data?.uid, 'uid', 1, 128);
  if (uid.includes('/')) throw new HttpsError('invalid-argument', 'Identificador inválido.');
  const ref = getFirestore().collection('users').doc(uid);
  const profile = await ref.get();
  if (!profile.exists || profile.data().role !== VIEWER_ROLE) throw new HttpsError('not-found', 'Responsável não encontrado.');
  // Mantém o perfil bloqueado até concluir a remoção no Auth, permitindo repetir falhas parciais.
  await ref.update({ status: 'blocked', updatedAt: FieldValue.serverTimestamp() });
  try { await getAuth().deleteUser(uid); }
  catch (error) { if (error.code !== 'auth/user-not-found') throw new HttpsError('internal', 'Não foi possível excluir o acesso. Tente novamente.'); }
  await ref.delete();
  return { ok: true };
});

export const resetBranchViewerPassword = onCall(ADMIN_FUNCTION_OPTIONS, async (request) => {
  requireSuperAdmin(request);
  const uid = requiredText(request.data?.uid, "uid", 1, 128);
  const profile = await getFirestore().collection("users").doc(uid).get();
  if (!profile.exists || profile.data().role !== VIEWER_ROLE) {
    throw new HttpsError("not-found", "Acesso de consulta não encontrado.");
  }
  const password = generateFriendlyPassword();
  await getAuth().updateUser(uid, { password });
  await getAuth().setCustomUserClaims(uid, { role: VIEWER_ROLE, branchId: profile.data().branchId, status: profile.data().status, mustChangePassword: true });
  return { uid, username: profile.data().displayName, password };
});

export const deleteAction = onCall(ADMIN_FUNCTION_OPTIONS, async (request) => {
  requireSuperAdmin(request);
  const actionId = requiredText(request.data?.actionId, "actionId", 1, 128);
  if (actionId.includes("/")) throw new HttpsError("invalid-argument", "Identificador inválido.");

  const db = getFirestore();
  const actionRef = db.collection("actions").doc(actionId);
  const action = await actionRef.get();
  if (!action.exists) throw new HttpsError("not-found", "Ação não encontrada.");

  const actionData = action.data();
  const [volunteers, attendance] = await Promise.all([
    db.collection("volunteers").where("actionIds", "array-contains", actionId).get(),
    db.collection("attendance").where("actionId", "==", actionId).get(),
  ]);
  const volunteerUpdates = await Promise.all(volunteers.docs.map(async (item) => {
    const remainingActionIds = (item.data().actionIds ?? []).filter((id) => id !== actionId);
    const remainingActions = remainingActionIds.length ? await db.getAll(...remainingActionIds.map((id) => db.collection("actions").doc(id))) : [];
    return {
      ref: item.ref,
      actionIds: remainingActionIds,
      regionalIds: [...new Set(remainingActions.filter((item) => item.exists).map((item) => item.data().branchId))],
    };
  }));
  const writer = db.bulkWriter();
  volunteerUpdates.forEach((item) => writer.update(item.ref, { actionIds: item.actionIds, regionalIds: item.regionalIds, updatedAt: FieldValue.serverTimestamp() }));
  attendance.docs.forEach((item) => writer.delete(item.ref));
  writer.delete(db.collection("attendanceSessions").doc(actionId));
  await writer.close();

  const photoPaths = ['photosBefore', 'photosDuring', 'photosAfter'].flatMap((field) => (actionData[field] ?? []).map((photo) => photo.path).filter(Boolean));
  await Promise.all(photoPaths.map((path) => getStorage().bucket().file(path).delete().catch(() => {})));
  await actionRef.delete();
  return { ok: true, removedVolunteers: volunteers.size, removedAttendance: attendance.size };
});

export const manageVolunteerAccess = onCall(ADMIN_FUNCTION_OPTIONS, async (request) => {
  requireSuperAdmin(request);
  const volunteerId = requiredText(request.data?.volunteerId, 'volunteerId', 1, 128);
  if (volunteerId.includes('/')) throw new HttpsError('invalid-argument', 'Identificador inválido.');
  const action = request.data?.action;
  if (!['create', 'activate', 'block', 'resetPassword', 'delete'].includes(action)) throw new HttpsError('invalid-argument', 'Operação inválida.');
  const reference = getFirestore().collection('volunteers').doc(volunteerId);
  const snapshot = await reference.get();
  if (!snapshot.exists) throw new HttpsError('not-found', 'Voluntário não encontrado.');
  const auth = getAuth();
  const email = String(snapshot.data().email ?? '').trim().toLowerCase();
  if (['create', 'resetPassword'].includes(action) && !/^\S+@\S+\.\S+$/.test(email)) throw new HttpsError('failed-precondition', 'Cadastre um e-mail válido para gerar o acesso do voluntário.');

  if (action === 'create') {
    if (snapshot.data().accessStatus !== 'none') throw new HttpsError('already-exists', 'Este voluntário já possui acesso.');
    const password = generateFriendlyPassword();
    let createdAuthUser = false;
    try {
      await auth.createUser({ uid: volunteerId, displayName: snapshot.data().fullName, email, password });
      createdAuthUser = true;
      await auth.setCustomUserClaims(volunteerId, { role: VOLUNTEER_ROLE, status: 'active' });
      await reference.update({ accessStatus: 'active', status: 'active', updatedAt: FieldValue.serverTimestamp() });
      const passwordResetLink = await auth.generatePasswordResetLink(email);
      return { username: email, password, passwordResetLink };
    } catch (error) {
      if (createdAuthUser) await auth.deleteUser(volunteerId).catch(() => {});
      if (error.code === 'auth/uid-already-exists' || error.code === 'auth/email-already-exists') throw new HttpsError('already-exists', 'Este voluntário já possui acesso.');
      throw new HttpsError('internal', 'Não foi possível criar o acesso do voluntário.');
    }
  }
  if (action === 'delete') {
    try { await auth.deleteUser(volunteerId); } catch (error) { if (error.code !== 'auth/user-not-found') throw new HttpsError('internal', 'Não foi possível excluir o acesso.'); }
    const batch = getFirestore().batch();
    batch.delete(reference);
    batch.delete(getFirestore().collection('volunteerPrivate').doc(volunteerId));
    await batch.commit();
    return { ok: true };
  }
  let account;
  try { account = await auth.getUser(volunteerId); } catch {
    if ((action === 'activate' || action === 'block') && snapshot.data().accessStatus === 'none') {
      const status = action === 'activate' ? 'active' : 'blocked';
      await reference.update({ status, updatedAt: FieldValue.serverTimestamp() });
      return { status, accessStatus: 'none' };
    }
    throw new HttpsError('not-found', 'Este voluntário ainda não possui acesso.');
  }
  if (action === 'resetPassword') {
    const password = generateFriendlyPassword();
    await auth.updateUser(account.uid, { email, password });
    const passwordResetLink = await auth.generatePasswordResetLink(email);
    return { username: email, password, passwordResetLink };
  }
  const status = action === 'activate' ? 'active' : 'blocked';
  await auth.updateUser(account.uid, { disabled: status === 'blocked' });
  await auth.setCustomUserClaims(account.uid, { role: VOLUNTEER_ROLE, status });
  await reference.update({ status, accessStatus: status, updatedAt: FieldValue.serverTimestamp() });
  return { status };
});

// Finaliza a publicação do PDF já enviado ao Storage. Isso permite repetir
// somente a etapa de catálogo se houver falha entre upload e Firestore, sem
// duplicar o arquivo nem deixar a página pública apontando para "em breve".
export const publishPublicReport2025 = onCall(ADMIN_FUNCTION_OPTIONS, async (request) => {
  requireSuperAdmin(request);

  const file = getStorage().bucket().file(REPORT_PATH);
  const [exists] = await file.exists();
  if (!exists) throw new HttpsError("not-found", "Envie o PDF antes de publicá-lo.");

  const [metadata] = await file.getMetadata();
  const size = Number(metadata.size);
  if (metadata.contentType !== "application/pdf" || !Number.isSafeInteger(size) || size <= 0 || size > MAX_REPORT_SIZE) {
    throw new HttpsError("failed-precondition", "O arquivo armazenado não é um PDF válido de até 25 MB.");
  }

  const fileName = String(metadata.metadata?.originalFileName || metadata.name?.split("/").at(-1) || "relatorio-mobilizacao-2025.pdf").slice(0, 180);
  await getFirestore().collection("publicReports").doc(REPORT_YEAR).set({
    year: REPORT_YEAR,
    path: REPORT_PATH,
    fileName,
    size,
    publishedAt: FieldValue.serverTimestamp(),
    publishedBy: request.auth.uid,
  });

  return { year: REPORT_YEAR, path: REPORT_PATH, fileName, size };
});
