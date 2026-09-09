import { getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { FieldValue, getFirestore } from "firebase-admin/firestore";

const projectId = "campanha-mobilizacao-dev";
const email = "superadmin@example.test";
const password = "DevOnly123!";

if (!projectId.endsWith("-dev")) throw new Error("Seed permitido somente no projeto de desenvolvimento.");

process.env.FIREBASE_AUTH_EMULATOR_HOST = "127.0.0.1:9099";
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";

const app = getApps()[0] ?? initializeApp({ projectId });
const auth = getAuth(app);
const db = getFirestore(app);

let account;
try {
  account = await auth.getUserByEmail(email);
} catch (error) {
  if (error.code !== "auth/user-not-found") throw error;
  account = await auth.createUser({ email, password, displayName: "SuperAdmin de Teste" });
}

await auth.setCustomUserClaims(account.uid, {
  role: "superAdmin",
  branchId: null,
  status: "active",
});

await db.collection("users").doc(account.uid).set({
  displayName: "SuperAdmin de Teste",
  email,
  role: "superAdmin",
  branchId: null,
  status: "active",
  createdAt: FieldValue.serverTimestamp(),
  updatedAt: FieldValue.serverTimestamp(),
}, { merge: true });

console.log("SuperAdmin fictício pronto:");
console.log(`  E-mail: ${email}`);
console.log(`  Senha: ${password}`);
