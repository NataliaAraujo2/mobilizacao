import { after, afterEach, before } from "node:test";
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from "@firebase/rules-unit-testing";
import { collection, deleteDoc, doc, getDoc, getDocs, limit, orderBy, query, setDoc, Timestamp, updateDoc, where, writeBatch } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";

const PROJECT_ID = "campanha-mobilizacao-dev";
let environment;
const ACTION_START = new Date(Date.now() - 60 * 60 * 1000);
const ACTION_END = new Date(Date.now() + 24 * 60 * 60 * 1000);

test('links curtos expõem somente o destino público; cadastro e exclusão exclusivos do administrador', async () => {
  const url = 'https://firebasestorage.googleapis.com/v0/b/test/o/doc.pdf?alt=media';
  await environment.withSecurityRulesDisabled(async context => {
    await setDoc(doc(context.firestore(), 'uploads', 'legacy-document'), { name: 'PDF legado', url });
  });
  const adminDb = auth('admin-links', 'superAdmin').firestore();
  const publicDb = environment.unauthenticatedContext().firestore();
  const token = '0123456789abcdef01234567';
  const data = { uploadId: 'legacy-document', url };
  await assertFails(setDoc(doc(publicDb, 'publicDocumentLinks', token), data));
  await assertFails(setDoc(doc(auth('viewer-links', 'branchViewer', 'sp').firestore(), 'publicDocumentLinks', token), data));
  await assertFails(setDoc(doc(adminDb, 'publicDocumentLinks', token), { ...data, url: 'https://example.com' }));
  await assertFails(setDoc(doc(adminDb, 'publicDocumentLinks', token), { ...data, createdBy: 'admin-links' }));
  await assertFails(setDoc(doc(adminDb, 'publicDocumentLinks', token), { ...data, uploadId: 'missing' }));
  await assertSucceeds(setDoc(doc(adminDb, 'publicDocumentLinks', token), data));
  assert.deepEqual((await assertSucceeds(getDoc(doc(publicDb, 'publicDocumentLinks', token)))).data(), data);
  await assertFails(getDocs(collection(publicDb, 'publicDocumentLinks')));
  await assertFails(getDoc(doc(publicDb, 'uploads', 'legacy-document')));
  await assertFails(updateDoc(doc(adminDb, 'publicDocumentLinks', token), { url: 'https://example.com' }));
  await assertFails(deleteDoc(doc(publicDb, 'publicDocumentLinks', token)));
  await assertSucceeds(deleteDoc(doc(adminDb, 'publicDocumentLinks', token)));
  assert.equal((await getDoc(doc(publicDb, 'publicDocumentLinks', token))).exists(), false);
});

const branch = (name, code, state) => ({
  name,
  code,
  state,
  status: "active",
  createdAt: null,
  updatedAt: null,
});

const user = ({ displayName, email, role, branchId = null, status = "active" }) => ({
  displayName,
  email,
  role,
  branchId,
  status,
  createdAt: null,
  updatedAt: null,
});

const volunteer = (branchId = "sp") => ({
  fullName: "Maria da Silva",
  fullNameSearch: "maria da silva",
  email: "maria@example.test",
  phone: "11999999999",
  actionIds: [`action-${branchId}`],
  regionalIds: [branchId],
  participationDates: ["2026-09-13"],
  status: "active",
  accessStatus: "none",
  createdAt: null,
  updatedAt: null,
});

const volunteerPrivate = (volunteerId) => ({
  volunteerId,
  cpf: "52998224725",
  rg: "123456789",
  birthDate: "1950-05-20",
  address: { cep: "01001000", street: "Praça da Sé", number: "1", complement: "", neighborhood: "Sé", city: "São Paulo", state: "SP" },
  shirtSize: "M",
  ngoRelationship: "Comunidade ou Projeto local",
  lgpdAccepted: true,
  regulationAccepted: true,
  imageUseAccepted: true,
  guardianAuthorizationAccepted: false,
  createdAt: null,
  updatedAt: null,
});

const action = (branchId = "sp") => ({
  name: "Mutirão da Praça",
  nameSearch: "mutirao da praca",
  branchId,
  coordinationState: branchId.toUpperCase(),
  publicVisible: false,
  date: "2026-09-21",
  dateStart: Timestamp.fromDate(ACTION_START),
  dateEnd: Timestamp.fromDate(ACTION_END),
  status: "planning",
  address: { cep: "01001000", street: "Praça da Sé", number: "1", complement: "", neighborhood: "Sé", city: "São Paulo", state: "SP", source: "cep" },
  whatToBring: "Luvas e água",
  tips: "Use protetor solar",
  photosBefore: [],
  photosDuring: [],
  photosAfter: [],
  createdAt: null,
  updatedAt: null,
});

function auth(uid, role, branchId = null, status = "active") {
  return environment.authenticatedContext(uid, { role, branchId, status });
}

before(async () => {
  environment = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      host: "127.0.0.1",
      port: 8080,
      rules: await readFile("firestore.rules", "utf8"),
    },
    storage: {
      host: "127.0.0.1",
      port: 9199,
      rules: await readFile("storage.rules", "utf8"),
    },
  });
});

afterEach(async () => {
  await environment.clearFirestore();
  await environment.clearStorage();
});

after(async () => {
  await environment.cleanup();
});

test("superAdmin cria e acessa qualquer regional", async () => {
  const db = auth("god-admin", "superAdmin").firestore();
  await assertSucceeds(setDoc(doc(db, "branches", "sp"), branch("Regional São Paulo", "SP", "SP")));
  await assertSucceeds(getDoc(doc(db, "branches", "sp")));
});

test('superadmin publica PDF e público abre o link, sem administrar arquivos', async () => {
  const admin = auth('admin-documents', 'superAdmin');
  const publicContext = environment.unauthenticatedContext();
  const path = 'uploads/public-documents/test-document.pdf';
  const pdf = new Blob(['%PDF-1.7\nPDF de teste'], { type: 'application/pdf' });
  await assertSucceeds(uploadBytes(ref(admin.storage(), path), pdf));
  const url = await assertSucceeds(getDownloadURL(ref(publicContext.storage(), path)));
  assert.ok(url.includes('test-document.pdf'));
  await assertFails(uploadBytes(ref(publicContext.storage(), 'uploads/public-documents/public-write.pdf'), pdf));
  await assertFails(uploadBytes(ref(auth('viewer-docs', 'branchViewer', 'sp').storage(), 'uploads/public-documents/viewer-write.pdf'), pdf));
  await assertFails(uploadBytes(ref(admin.storage(), 'uploads/public-documents/text.pdf'), new Blob(['texto'], { type: 'text/plain' })));
  await assertFails(deleteObject(ref(publicContext.storage(), path)));
  const data = { name: 'Documento de teste.pdf', path, url, size: pdf.size, contentType: 'application/pdf', createdBy: 'admin-documents', createdAt: Timestamp.now() };
  await assertSucceeds(setDoc(doc(admin.firestore(), 'uploads', 'test-document'), data));
  await assertFails(getDoc(doc(publicContext.firestore(), 'uploads', 'test-document')));
  await assertFails(getDocs(collection(publicContext.firestore(), 'uploads')));
  await assertFails(setDoc(doc(publicContext.firestore(), 'uploads', 'test-document'), data));
  await assertFails(setDoc(doc(admin.firestore(), 'uploads', 'wrong-path'), data));
  await assertSucceeds(deleteObject(ref(admin.storage(), path)));
  await assertSucceeds(deleteDoc(doc(admin.firestore(), 'uploads', 'test-document')));
});

test('público lê contatos institucionais, mas não lê usuários nem altera contatos', async () => {
  const db = auth('admin-contacts', 'superAdmin').firestore();
  await setDoc(doc(db, 'branches', 'df'), branch('Coordenação DF', 'DF', 'DF'));
  const contacts = { name: 'Coordenação DF', state: 'DF', status: 'active', phone: '61999991234', email: 'df@example.org', updatedAt: Timestamp.now() };
  await assertSucceeds(setDoc(doc(db, 'publicCoordinationContacts', 'df'), contacts));
  const publicDb = environment.unauthenticatedContext().firestore();
  const read = await assertSucceeds(getDoc(doc(publicDb, 'publicCoordinationContacts', 'df')));
  assert.equal(read.data().phone, contacts.phone);
  await assertFails(getDoc(doc(publicDb, 'users', 'responsavel-df')));
  await assertFails(setDoc(doc(publicDb, 'publicCoordinationContacts', 'df'), contacts));
  await assertFails(setDoc(doc(auth('viewer-df', 'branchViewer', 'df').firestore(), 'publicCoordinationContacts', 'df'), contacts));
  await assertFails(setDoc(doc(db, 'publicCoordinationContacts', 'df'), { ...contacts, contactName: 'Responsável privado' }));
  await assertFails(setDoc(doc(db, 'publicCoordinationContacts', 'df'), { ...contacts, phone: '123' }));
  await assertFails(setDoc(doc(db, 'publicCoordinationContacts', 'inexistente'), contacts));
});

test('metadados da coordenação sincronizam em lote sem apagar telefone e e-mail', async () => {
  const db = auth('admin-contacts', 'superAdmin').firestore();
  await setDoc(doc(db, 'branches', 'df'), branch('Coordenação DF', 'DF', 'DF'));
  await setDoc(doc(db, 'publicCoordinationContacts', 'df'), { name: 'Coordenação DF', state: 'DF', status: 'active', phone: '61999991234', email: 'df@example.org', updatedAt: Timestamp.now() });
  const batch = writeBatch(db);
  batch.update(doc(db, 'branches', 'df'), { name: 'Coordenação Distrito Federal', status: 'inactive' });
  batch.set(doc(db, 'publicCoordinationContacts', 'df'), { name: 'Coordenação Distrito Federal', state: 'DF', status: 'inactive', updatedAt: Timestamp.now() }, { merge: true });
  await assertSucceeds(batch.commit());
  const saved = (await getDoc(doc(db, 'publicCoordinationContacts', 'df'))).data();
  assert.equal(saved.phone, '61999991234');
  assert.equal(saved.email, 'df@example.org');
  assert.equal(saved.status, 'inactive');
});

test("perfil antigo branchAdmin não possui mais acesso", async () => {
  await environment.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), "branches", "sp"), branch("Regional São Paulo", "SP", "SP"));
  });

  const db = auth("admin-sp", "branchAdmin", "sp").firestore();
  await assertFails(getDoc(doc(db, "branches", "sp")));
  await assertFails(setDoc(doc(db, "branches", "mg"), branch("Regional Minas Gerais", "MG", "MG")));
});

test("voluntário consulta a própria regional, mas não administra dados", async () => {
  await environment.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), "branches", "sp"), branch("Regional São Paulo", "SP", "SP"));
  });

  const db = auth("volunteer-sp", "volunteer", "sp").firestore();
  await assertSucceeds(getDoc(doc(db, "branches", "sp")));
  await assertFails(updateDoc(doc(db, "branches", "sp"), { name: "Alteração indevida" }));
});

test("usuário de consulta lê somente a própria regional e não altera dados", async () => {
  await environment.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), "branches", "sp"), branch("Regional São Paulo", "SP", "SP"));
    await setDoc(doc(context.firestore(), "branches", "rj"), branch("Regional Rio de Janeiro", "RJ", "RJ"));
  });

  const db = auth("branch-viewer-sp", "branchViewer", "sp").firestore();
  await assertSucceeds(getDoc(doc(db, "branches", "sp")));
  await assertFails(getDoc(doc(db, "branches", "rj")));
  await assertFails(updateDoc(doc(db, "branches", "sp"), { name: "Alteração indevida" }));
});

test("perfis de usuários e papéis privilegiados são exclusivos das Functions", async () => {
  const db = auth("god-admin", "superAdmin").firestore();
  const completeProfile = {
    ...user({ displayName: "USUARIO_SP", email: "usuario_sp@acesso.mobilizacao.invalid", role: "branchViewer", branchId: "sp" }),
    contactName: "Maria Responsável",
    contactNameSearch: "maria responsavel",
    contactEmail: "maria@example.test",
    contactPhone: "11999999999",
  };
  await assertFails(setDoc(doc(db, "users", "viewer-sp"), completeProfile));
  await assertFails(setDoc(doc(db, "users", "another-super-admin"), user({ displayName: "Outro admin", email: "admin@example.test", role: "superAdmin" })));
});

test("somente superAdmin cadastra dados comuns e documentos pessoais", async () => {
  const db = auth("god-admin", "superAdmin").firestore();
  await assertSucceeds(setDoc(doc(db, "volunteers", "volunteer-sp"), volunteer("sp")));
  await assertSucceeds(setDoc(doc(db, "volunteerPrivate", "volunteer-sp"), volunteerPrivate("volunteer-sp", "sp")));
  const sharedDb = auth("viewer-sp", "branchViewer", "sp").firestore();
  await assertFails(setDoc(doc(sharedDb, "volunteers", "another-sp"), volunteer("sp")));
  await assertFails(setDoc(doc(sharedDb, "volunteerPrivate", "another-sp"), volunteerPrivate("another-sp", "sp")));
});

test("conta compartilhada não consulta documentos pessoais, inclusive da própria regional", async () => {
  await environment.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), "volunteerPrivate", "volunteer-sp"), volunteerPrivate("volunteer-sp", "sp"));
    await setDoc(doc(context.firestore(), "volunteerPrivate", "volunteer-rj"), volunteerPrivate("volunteer-rj", "rj"));
  });

  const db = auth("viewer-sp", "branchViewer", "sp").firestore();
  await assertFails(getDoc(doc(db, "volunteerPrivate", "volunteer-sp")));
  await assertFails(getDoc(doc(db, "volunteerPrivate", "volunteer-rj")));
});

test("voluntário acessa os próprios documentos, mas não consegue alterá-los", async () => {
  await environment.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), "volunteerPrivate", "volunteer-sp"), volunteerPrivate("volunteer-sp", "sp"));
  });

  const privateProfile = doc(auth("volunteer-sp", "volunteer", "sp").firestore(), "volunteerPrivate", "volunteer-sp");
  await assertSucceeds(getDoc(privateProfile));
  await assertFails(updateDoc(privateProfile, { rg: "987654321", updatedAt: null }));
});

test("regional e vínculo dos documentos pessoais não podem ser trocados", async () => {
  await environment.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), "volunteerPrivate", "volunteer-sp"), volunteerPrivate("volunteer-sp", "sp"));
  });

  const privateProfile = doc(auth("god-admin", "superAdmin").firestore(), "volunteerPrivate", "volunteer-sp");
  await assertFails(updateDoc(privateProfile, { branchId: "rj", updatedAt: null }));
  await assertFails(updateDoc(privateProfile, { volunteerId: "another-user", updatedAt: null }));
});

test("superAdmin cadastra ação e conta compartilhada apenas consulta a própria regional", async () => {
  const adminDb = auth("god-admin", "superAdmin").firestore();
  await assertSucceeds(setDoc(doc(adminDb, "actions", "action-sp"), action("sp")));

  const viewerDb = auth("viewer-sp", "branchViewer", "sp").firestore();
  await assertSucceeds(getDoc(doc(viewerDb, "actions", "action-sp")));
  await assertFails(updateDoc(doc(viewerDb, "actions", "action-sp"), { tips: "Alteração indevida" }));

  await environment.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), "actions", "action-rj"), action("rj"));
  });
  await assertFails(getDoc(doc(viewerDb, "actions", "action-rj")));
});

test("mapa público lê somente ações publicadas da coordenação", async () => {
  await environment.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await setDoc(doc(db, "actions", "public-sp"), { ...action("sp"), publicVisible: true });
    await setDoc(doc(db, "actions", "private-sp"), action("sp"));
  });
  const publicDb = environment.unauthenticatedContext().firestore();
  await assertSucceeds(getDoc(doc(publicDb, "actions", "public-sp")));
  await assertFails(getDoc(doc(publicDb, "actions", "private-sp")));
  await assertSucceeds(getDocs(query(collection(publicDb, "actions"), where("coordinationState", "==", "SP"), where("publicVisible", "==", true))));
  await assertFails(getDocs(query(collection(publicDb, "actions"), where("coordinationState", "==", "SP"))));
});

test("superAdmin ainda edita ação antiga que não possui os campos do mapa", async () => {
  await environment.withSecurityRulesDisabled(async (context) => {
    const legacy = action("sp");
    delete legacy.coordinationState;
    delete legacy.publicVisible;
    await setDoc(doc(context.firestore(), "actions", "legacy-sp"), legacy);
  });
  const db = auth("god-admin", "superAdmin").firestore();
  await assertSucceeds(updateDoc(doc(db, "actions", "legacy-sp"), { tips: "Orientação atualizada" }));
});

test("responsável regional registra presença somente em ação e voluntário da própria regional", async () => {
  await environment.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await setDoc(doc(db, "actions", "action-sp"), action("sp"));
    await setDoc(doc(db, "actions", "action-rj"), action("rj"));
    await setDoc(doc(db, "volunteers", "volunteer-sp"), volunteer("sp"));
    await setDoc(doc(db, "volunteers", "volunteer-rj"), volunteer("rj"));
  });
  const db = auth("viewer-sp", "branchViewer", "sp").firestore();
  const ownAttendance = { actionId: "action-sp", branchId: "sp", volunteerId: "volunteer-sp", present: true, updatedAt: null };
  await assertSucceeds(setDoc(doc(db, "attendance", "action-sp_volunteer-sp"), ownAttendance));
  await assertSucceeds(getDocs(query(collection(db, "attendance"), where("actionId", "==", "action-sp"), where("branchId", "==", "sp"))));
  await assertSucceeds(deleteDoc(doc(db, "attendance", "action-sp_volunteer-sp")));
  await assertFails(setDoc(doc(db, "attendance", "action-rj_volunteer-rj"), { ...ownAttendance, actionId: "action-rj", branchId: "rj", volunteerId: "volunteer-rj" }));
  await assertFails(setDoc(doc(db, "attendance", "action-sp_volunteer-rj"), { ...ownAttendance, volunteerId: "volunteer-rj" }));
});

test("consulta da regional precisa filtrar e paginar somente documentos da própria regional", async () => {
  await environment.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), "volunteers", "volunteer-sp-1"), { ...volunteer("sp"), fullName: "Ana Silva", fullNameSearch: "ana silva" });
    await setDoc(doc(context.firestore(), "volunteers", "volunteer-sp-2"), { ...volunteer("sp"), fullName: "Beatriz Souza", fullNameSearch: "beatriz souza" });
    await setDoc(doc(context.firestore(), "volunteers", "volunteer-rj-1"), { ...volunteer("rj"), fullName: "Carla Lima", fullNameSearch: "carla lima" });
  });
  const db = auth("viewer-sp", "branchViewer", "sp").firestore();
  await assertSucceeds(getDocs(query(collection(db, "volunteers"), where("regionalIds", "array-contains", "sp"), orderBy("fullNameSearch"), limit(1))));
  await assertFails(getDocs(query(collection(db, "volunteers"), orderBy("fullNameSearch"), limit(25))));
  await assertFails(getDocs(query(collection(db, "volunteers"), where("regionalIds", "array-contains", "rj"), orderBy("fullNameSearch"), limit(25))));
});

test("contador de associados é público, mas não permite listar outros dados", async () => {
  await environment.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), "publicStats", "associationCampaign"), {
      newAssociates: 12,
      updatedAt: Timestamp.now(),
      updatedBy: "god-admin",
    });
  });

  const publicDb = environment.unauthenticatedContext().firestore();
  await assertSucceeds(getDoc(doc(publicDb, "publicStats", "associationCampaign")));
  await assertFails(getDocs(collection(publicDb, "publicStats")));
});

test("somente superAdmin atualiza o contador de associados com valor válido", async () => {
  const validStats = { newAssociates: 25, updatedAt: Timestamp.now(), updatedBy: "god-admin" };
  const adminDb = auth("god-admin", "superAdmin").firestore();
  await assertSucceeds(setDoc(doc(adminDb, "publicStats", "associationCampaign"), validStats));
  await assertFails(setDoc(doc(adminDb, "publicStats", "associationCampaign"), { ...validStats, newAssociates: -1 }));

  const viewerDb = auth("viewer-sp", "branchViewer", "sp").firestore();
  await assertFails(setDoc(doc(viewerDb, "publicStats", "associationCampaign"), { ...validStats, updatedBy: "viewer-sp" }));
});

test("Storage aceita foto comprimida da ação somente do superAdmin", async () => {
  const image = new Blob(["fake-image"], { type: "image/webp" });
  await assertSucceeds(uploadBytes(ref(auth("god-admin", "superAdmin").storage(), "branches/sp/actions/action-sp/before/photo.webp"), image));
  await assertFails(uploadBytes(ref(auth("viewer-sp", "branchViewer", "sp").storage(), "branches/sp/actions/action-sp/before/viewer.webp"), image));
});

test("Storage aceita somente WebP de até 5 MB nas fases permitidas", async () => {
  const storage = auth("god-admin", "superAdmin").storage();
  const webp = new Blob(["imagem"], { type: "image/webp" });
  const png = new Blob(["imagem"], { type: "image/png" });
  await assertSucceeds(uploadBytes(ref(storage, "branches/sp/actions/action-sp/during/photo.webp"), webp));
  await assertFails(uploadBytes(ref(storage, "branches/sp/actions/action-sp/invalid/photo.webp"), webp));
  await assertFails(uploadBytes(ref(storage, "branches/sp/actions/action-sp/after/photo.png"), png));
  assert.match(await readFile("storage.rules", "utf8"), /request\.resource\.size <= 5 \* 1024 \* 1024/);
});

test("usuário bloqueado não acessa a regional", async () => {
  await environment.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), "branches", "sp"), branch("Regional São Paulo", "SP", "SP"));
  });

  const db = auth("blocked-user", "volunteer", "sp", "blocked").firestore();
  await assertFails(getDoc(doc(db, "branches", "sp")));
});

test("somente superAdmin envia imagens; conta compartilhada apenas consulta", async () => {
  const storage = auth("god-admin", "superAdmin").storage();
  const sharedStorage = auth("viewer-sp", "branchViewer", "sp").storage();
  const image = new Blob(["fake-image"], { type: "image/webp" });

  await assertSucceeds(uploadBytes(ref(storage, "branches/sp/mobilization/photo.webp"), image));
  await assertFails(uploadBytes(ref(sharedStorage, "branches/sp/mobilization/shared-photo.webp"), image));
});

test("busca de responsáveis das regionais é paginada e exclusiva do superAdmin", async () => {
  await environment.withSecurityRulesDisabled(async context => {
    await Promise.all(Array.from({ length: 30 }, (_, index) => setDoc(doc(context.firestore(), 'users', `contact-${index}`), {
      role: 'branchViewer', contactName: `Responsável ${String(index).padStart(2, '0')}`, contactNameSearch: `responsavel ${String(index).padStart(2, '0')}`, contactPhone: '11999999999', branchId: 'sp',
    })));
  });
  const adminDb = auth('admin', 'superAdmin').firestore();
  const makeQuery = db => query(collection(db, 'users'), where('role', '==', 'branchViewer'), orderBy('contactNameSearch'), limit(26));
  const result = await assertSucceeds(getDocs(makeQuery(adminDb)));
  assert.equal(result.size, 26);
  assert.equal(result.docs[0].data().contactName, 'Responsável 00');
  await assertFails(getDocs(makeQuery(auth('viewer', 'branchViewer', 'sp').firestore())));
  await assertFails(getDocs(makeQuery(environment.unauthenticatedContext().firestore())));
});

test("Storage rejeita arquivo que não seja imagem", async () => {
  const storage = auth("god-admin", "superAdmin").storage();
  const text = new Blob(["not-an-image"], { type: "text/plain" });
  await assertFails(uploadBytes(ref(storage, "branches/sp/mobilization/file.txt"), text));
});
