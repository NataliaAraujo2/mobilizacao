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
const VIEWER_EMAIL_DOMAIN = "acesso.mobilizacao.invalid";
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

export const publicVolunteerActions = onCall(PUBLIC_FUNCTION_OPTIONS, async (request) => {
  const actionId = String(request.data?.actionId ?? '').trim();
  if (actionId) {
    const item = await getFirestore().collection('actions').doc(actionId).get();
    if (!item.exists) throw new HttpsError('not-found', 'A ação não foi encontrada.');
    const action = item.data();
    if (actionPhase(action) === 'completed') throw new HttpsError('failed-precondition', 'Esta ação não está mais disponível para inscrição.');
    return [{ id: item.id, name: action.name, date: action.date, startDate: action.startDate, endDate: action.endDate, startTime: action.startTime, endTime: action.endTime, scheduleText: action.scheduleText, description: action.description, branchId: action.branchId, address: action.address, whatToBring: action.whatToBring, tips: action.tips, status: action.status }];
  }
  const state = requiredText(request.data?.state, 'state', 2, 2).toUpperCase();
  const db = getFirestore();
  const branches = await db.collection('branches').where('state', '==', state).get();
  const branchIds = branches.docs.filter(item => item.data().status === 'active').map(item => item.id).slice(0, 30);
  if (!branchIds.length) return [];
  const snapshot = await db.collection('actions').where('branchId', 'in', branchIds).limit(50).get();
  return snapshot.docs.map(item => {
    const action = item.data();
    return { id: item.id, name: action.name, date: action.date, startDate: action.startDate, endDate: action.endDate, startTime: action.startTime, endTime: action.endTime, scheduleText: action.scheduleText, description: action.description, branchId: action.branchId, address: action.address, whatToBring: action.whatToBring, tips: action.tips, status: action.status };
  }).filter(action => actionPhase(action) !== 'completed');
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
  const address = { cep: digits(addressInput.cep), street: requiredText(addressInput.street, 'logradouro', 2, 160), number: requiredText(addressInput.number, 'número', 1, 30), complement: String(addressInput.complement ?? '').trim(), neighborhood: requiredText(addressInput.neighborhood, 'bairro', 2, 120), city: requiredText(addressInput.city, 'cidade', 2, 120), state: requiredText(addressInput.state, 'estado', 2, 2).toUpperCase() };
  const shirtSize = requiredText(profile.shirtSize, 'tamanho da camiseta', 1, 10).toUpperCase();
  const ngoRelationship = requiredText(profile.ngoRelationship, 'vínculo com a ONG', 2, 120);
  if (!validCpf(cpf)) throw new HttpsError('invalid-argument', 'CPF inválido.');
  if (phone && !isValidPhone(phone, 13)) throw new HttpsError('invalid-argument', 'Telefone inválido.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) throw new HttpsError('invalid-argument', 'Data de nascimento inválida.');
  if (!/^\d{8}$/.test(address.cep) || !BRAZIL_STATE_CODES.has(address.state) || !['PP', 'P', 'M', 'G', 'GG', 'XG', 'OUTRO'].includes(shirtSize) || !['Comunidade ou Projeto local', 'Empregado ou Aposentado da CAIXA', 'Indicação de amigos ou família'].includes(ngoRelationship) || profile.lgpdAccepted !== true || profile.regulationAccepted !== true || profile.imageUseAccepted !== true || (isMinorBirthDate(birthDate) && profile.guardianAuthorizationAccepted !== true)) throw new HttpsError('invalid-argument', 'Dados complementares ou autorizações do voluntário inválidos.');
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
      return { username: email, password };
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
    return { username: email, password };
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
