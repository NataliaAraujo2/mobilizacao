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
const REPORT_YEAR = "2025";
const REPORT_PATH = `public-reports/${REPORT_YEAR}/report.pdf`;
const MAX_REPORT_SIZE = 25 * 1024 * 1024;
// Operações administrativas são pouco frequentes. Mantemos custo zero em
// repouso e impedimos escala inesperada por repetição acidental de chamadas.
const ADMIN_FUNCTION_OPTIONS = { region: REGION, minInstances: 0, maxInstances: 2, concurrency: 10 };

function requireSuperAdmin(request) {
  if (!request.auth || request.auth.token.role !== "superAdmin" || request.auth.token.status !== "active") {
    throw new HttpsError("permission-denied", "Apenas o superAdmin pode executar esta operação.");
  }
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

async function getBranch(branchId) {
  const snapshot = await getFirestore().collection("branches").doc(branchId).get();
  if (!snapshot.exists) throw new HttpsError("not-found", "A regional informada não existe.");
  return snapshot;
}

async function nextBranchViewerIdentity(state, reservedUsernames = new Set()) {
  const snapshot = await getFirestore().collection("users").where("role", "==", VIEWER_ROLE).get();
  const username = nextBranchViewerUsername(state, snapshot.docs.map((item) => item.data().displayName), reservedUsernames);
  return { username, email: `${username.toLowerCase()}@${VIEWER_EMAIL_DOMAIN}` };
}

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
  const uid = `branch-viewer-${branchId}`;
  const auth = getAuth();
  const db = getFirestore();
  const reservedUsernames = new Set();

  if ((await db.collection("users").doc(uid).get()).exists) {
    throw new HttpsError("already-exists", "Esta regional já possui um acesso de consulta.");
  }

  // Duas solicitações simultâneas para a mesma UF podem escolher o mesmo
  // sufixo. Em caso de colisão de e-mail, tentamos o próximo identificador;
  // nunca excluímos uma conta que já existia.
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const { username, email } = await nextBranchViewerIdentity(state, reservedUsernames);
    const password = generateFriendlyPassword();
    let createdAuthUser = false;
    try {
      await auth.createUser({ uid, displayName: username, email, password });
      createdAuthUser = true;
      await auth.setCustomUserClaims(uid, { role: VIEWER_ROLE, branchId, status: "active" });
      await db.collection("users").doc(uid).set({
        displayName: username,
        email,
        role: VIEWER_ROLE,
        branchId,
        contactName,
        contactNameSearch: normalizeSearchText(contactName),
        contactEmail,
        contactPhone,
        status: "active",
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
      return { uid, username, password };
    } catch (error) {
      // Só remove a conta criada por esta própria tentativa após uma falha
      // posterior. Conflitos nunca excluem uma conta que já existia.
      if (createdAuthUser) await auth.deleteUser(uid).catch(() => {});
      if (error.code === "auth/uid-already-exists") {
        throw new HttpsError("already-exists", "Esta regional já possui um acesso de consulta.");
      }
      if (error.code === "auth/email-already-exists") {
        reservedUsernames.add(username);
        continue;
      }
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

export const completeSuperAdminPasswordChange = onCall(ADMIN_FUNCTION_OPTIONS, async (request) => {
  if (!request.auth || request.auth.token.role !== "superAdmin" || request.auth.token.status !== "active") throw new HttpsError("permission-denied", "Acesso negado.");
  const password = requiredText(request.data?.password, "password", 10, 128);
  await getAuth().updateUser(request.auth.uid, { password });
  await getAuth().setCustomUserClaims(request.auth.uid, { role: "superAdmin", status: "active", mustChangePassword: false });
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
    throw new HttpsError("not-found", "Acesso da regional não encontrado.");
  }
  await profile.ref.update({ contactName, contactNameSearch: normalizeSearchText(contactName), contactEmail, contactPhone, updatedAt: FieldValue.serverTimestamp() });
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
  return { uid, username: profile.data().displayName, password };
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
