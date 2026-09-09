import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { randomInt } from "node:crypto";

initializeApp();

const REGION = "southamerica-east1";
const VIEWER_ROLE = "branchViewer";
const VIEWER_EMAIL_DOMAIN = "acesso.mobilizacao.invalid";

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
  if (!snapshot.exists) throw new HttpsError("not-found", "A filial informada não existe.");
  return snapshot;
}

export const createBranchViewer = onCall({ region: REGION }, async (request) => {
  requireSuperAdmin(request);

  const branchId = requiredText(request.data?.branchId, "branchId", 1, 80);
  const contactName = requiredText(request.data?.contactName, "contactName", 2, 120);
  const contactEmail = requiredText(request.data?.contactEmail, "contactEmail", 5, 160).toLowerCase();
  const contactPhone = requiredText(request.data?.contactPhone, "contactPhone", 10, 20).replace(/\D/g, "");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) {
    throw new HttpsError("invalid-argument", "E-mail de contato inválido.");
  }
  if (contactPhone.length < 10 || contactPhone.length > 13) {
    throw new HttpsError("invalid-argument", "Telefone de contato inválido.");
  }
  const branch = await getBranch(branchId);
  const state = requiredText(branch.data().state, "state", 2, 2).toUpperCase();
  const username = `USUARIO_${state}`;
  const email = `${username.toLowerCase()}@${VIEWER_EMAIL_DOMAIN}`;
  const uid = `branch-viewer-${branchId}`;
  const password = generateFriendlyPassword();
  const auth = getAuth();
  const db = getFirestore();

  if ((await db.collection("users").doc(uid).get()).exists) {
    throw new HttpsError("already-exists", "Esta filial já possui um acesso de consulta.");
  }

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
      contactEmail,
      contactPhone,
      status: "active",
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
  } catch (error) {
    // Só remove a conta se ela tiver sido criada por esta tentativa. Nunca
    // excluímos uma conta já existente ao receber auth/uid-already-exists.
    if (createdAuthUser) await auth.deleteUser(uid).catch(() => {});
    if (error.code === "auth/uid-already-exists" || error.code === "auth/email-already-exists") {
      throw new HttpsError("already-exists", "Esta filial já possui um acesso de consulta.");
    }
    throw new HttpsError("internal", "Não foi possível gerar o acesso de consulta.");
  }

  return { uid, username, password };
});

export const updateBranchViewer = onCall({ region: REGION }, async (request) => {
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

export const updateBranchViewerContact = onCall({ region: REGION }, async (request) => {
  requireSuperAdmin(request);
  const uid = requiredText(request.data?.uid, "uid", 1, 128);
  const contactName = requiredText(request.data?.contactName, "contactName", 2, 120);
  const contactEmail = requiredText(request.data?.contactEmail, "contactEmail", 5, 160).toLowerCase();
  const contactPhone = requiredText(request.data?.contactPhone, "contactPhone", 10, 20).replace(/\D/g, "");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail) || contactPhone.length < 10 || contactPhone.length > 13) {
    throw new HttpsError("invalid-argument", "Dados de contato inválidos.");
  }
  const profile = await getFirestore().collection("users").doc(uid).get();
  if (!profile.exists || profile.data().role !== VIEWER_ROLE) {
    throw new HttpsError("not-found", "Acesso da filial não encontrado.");
  }
  await profile.ref.update({ contactName, contactEmail, contactPhone, updatedAt: FieldValue.serverTimestamp() });
  return { uid, contactName, contactEmail, contactPhone };
});

export const resetBranchViewerPassword = onCall({ region: REGION }, async (request) => {
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
