import { after, before, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { initializeApp, deleteApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeTestEnvironment, assertFails } from '@firebase/rules-unit-testing';
import { collection, doc, getDoc, getDocs, setDoc } from 'firebase/firestore';
import { createFormsApi } from './formsApi.js';

const manager = uid => ({ uid, token: { role: 'superAdmin', status: 'active' } });
const definition = () => ({ title: 'Unidades', description: '', instructions: '', validityDays: 30, sections: [{ id: 's1', title: 'Representantes', repeatable: true, addLabel: 'Adicionar unidade', questions: [{ id: 'q1', title: 'Nome', type: 'short', required: true, options: [] }] }] });
let environment, app, db, api, time;
before(async () => {
  assert.ok(process.env.FIRESTORE_EMULATOR_HOST, 'Execute com npm run test:forms:emulated. Nunca usar banco real.');
  const [host, port] = process.env.FIRESTORE_EMULATOR_HOST.split(':');
  environment = await initializeTestEnvironment({ projectId: 'demo-link-forms', firestore: { host, port: Number(port), rules: await readFile('firestore.rules', 'utf8') } });
  app = initializeApp({ projectId: 'demo-link-forms' }, 'forms-tests'); db = getFirestore(app); api = createFormsApi(db, () => time);
});
beforeEach(async () => { await environment.clearFirestore(); time = Date.UTC(2026, 8, 10); });
after(async () => { if (environment) await environment.cleanup(); if (app) await deleteApp(app); });
async function create(extra = {}, uid = 'owner') {
  return api.manage(manager(uid), { action: 'createCampaign', id: 'campaign1', title: 'Campanha', description: '', definition: definition(), mode: 'individual', expiresAt: time + 86400000, recipients: [{ name: 'Maria', phone: '11999999999' }, { name: 'João', phone: '' }], ...extra });
}
async function requests(uid = 'owner') { return api.manage(manager(uid), { action: 'listRequests', id: 'campaign1' }); }
const answers = { s1: [{ q1: 'SP' }, { q1: 'RJ' }] };

test('cria, edita, duplica e arquiva modelo sem mudar snapshot da campanha', async () => {
  const saved = await api.manage(manager('owner'), { action: 'saveTemplate', definition: definition() });
  await create(); const changed = definition(); changed.sections[0].questions[0].title = 'Novo texto';
  await api.manage(manager('owner'), { action: 'saveTemplate', id: saved.id, definition: changed });
  const copy = await api.manage(manager('owner'), { action: 'saveTemplate', definition: changed }); assert.notEqual(saved.id, copy.id);
  await api.manage(manager('owner'), { action: 'archiveTemplate', id: saved.id });
  const models = await api.manage(manager('owner'), { action: 'listTemplates', archived: true }); assert.equal(models.items.length, 1);
  const c = await api.manage(manager('owner'), { action: 'getCampaign', id: 'campaign1' }); assert.equal(c.definition.sections[0].questions[0].title, 'Nome');
});
test('gera campanha, tokens individuais diferentes e criação idempotente', async () => {
  await create(); const first = await requests(); assert.equal(first.items.length, 2);
  assert.notEqual(first.items[0].token, first.items[1].token); assert.match(first.items[0].token, /^[a-f0-9]{64}$/);
  await create(); assert.deepEqual(await requests(), first);
});
test('resposta pública válida preserva repetição e atualiza contador apenas uma vez em concorrência', async () => {
  await create(); const r = (await requests()).items[0];
  const opened = await api.public({ action: 'open', token: r.token }); assert.equal(opened.name, r.name); assert.equal(opened.ownerId, undefined); assert.equal(opened.phone, undefined);
  const results = await Promise.allSettled([api.public({ action: 'submit', token: r.token, answers }), api.public({ action: 'submit', token: r.token, answers })]);
  assert.equal(results.filter(r => r.status === 'fulfilled').length, 1);
  const response = await api.manage(manager('owner'), { action: 'getResponse', id: 'campaign1', requestId: r.id }); assert.deepEqual(response.answers, answers);
  const c = await api.manage(manager('owner'), { action: 'getCampaign', id: 'campaign1' }); assert.equal(c.responseCount, 1);
  await assert.rejects(api.public({ action: 'open', token: r.token }), /respondido/);
});
test('rejeita campos extras, alteração de destinatário, resposta inválida e token inventado', async () => {
  await create(); const r = (await requests()).items[0];
  await assert.rejects(api.public({ action: 'submit', token: r.token, answers, title: 'Ataque' }), /não solicitado/);
  await assert.rejects(api.public({ action: 'submit', token: r.token, answers, name: 'Outro' }), /não solicitado/);
  await assert.rejects(api.public({ action: 'submit', token: r.token, answers: { s1: [{ q1: 'SP', injected: 'admin' }] } }), /não solicitada/);
  await assert.rejects(api.public({ action: 'open', token: 'a'.repeat(64) }), /inválido/);
  assert.equal((await requests()).items[0].status, 'PENDENTE');
});
test('link expirado é bloqueado e filtro de expiração é feito no banco', async () => {
  await create(); const r = (await requests()).items[0]; time += 86400001;
  await assert.rejects(api.public({ action: 'submit', token: r.token, answers }), /expirado/);
  const expired = await api.manage(manager('owner'), { action: 'listRequests', id: 'campaign1', status: 'EXPIRADA' }); assert.equal(expired.items.length, 2); assert.equal(expired.items[0].status, 'EXPIRADA');
});
test('link cancelado e campanha arquivada não aceitam resposta', async () => {
  await create(); const rows = (await requests()).items;
  await api.manage(manager('owner'), { action: 'review', id: 'campaign1', requestId: rows[0].id, status: 'CANCELADA' });
  await assert.rejects(api.public({ action: 'submit', token: rows[0].token, answers }), /cancelado/);
  await api.manage(manager('owner'), { action: 'archiveCampaign', id: 'campaign1' });
  await assert.rejects(api.public({ action: 'submit', token: rows[1].token, answers }), /cancelado/);
});
test('aprova, rejeita e arquiva sem perder resposta ou alterar contador', async () => {
  await create(); const r = (await requests()).items[0]; await api.public({ action: 'submit', token: r.token, answers });
  for (const status of ['APROVADA', 'REJEITADA', 'ARCHIVE']) await api.manage(manager('owner'), { action: 'review', id: 'campaign1', requestId: r.id, status });
  const archived = await api.manage(manager('owner'), { action: 'listRequests', id: 'campaign1', archived: true }); assert.equal(archived.items[0].status, 'REJEITADA');
  const response = await api.manage(manager('owner'), { action: 'getResponse', id: 'campaign1', requestId: r.id }); assert.deepEqual(response.answers, answers);
});
test('limite de destinatários impede criação parcial', async () => {
  await assert.rejects(create({ recipients: Array.from({ length: 201 }, () => ({ name: 'Pessoa' })) }), /200/);
  const campaigns = await api.manage(manager('owner'), { action: 'listCampaigns' }); assert.equal(campaigns.items.length, 0);
});
test('paginação real retorna 25 registros por vez sem repetir destinatários', async () => {
  await create({ recipients: Array.from({ length: 60 }, (_, i) => ({ name: `Pessoa ${i}` })) });
  const p1 = await requests(); const p2 = await api.manage(manager('owner'), { action: 'listRequests', id: 'campaign1', cursor: p1.cursor });
  const p3 = await api.manage(manager('owner'), { action: 'listRequests', id: 'campaign1', cursor: p2.cursor });
  assert.equal(p1.items.length, 25); assert.equal(p2.items.length, 25); assert.equal(p3.items.length, 10); assert.equal(p3.cursor, null);
  assert.equal(new Set([...p1.items, ...p2.items, ...p3.items].map(r => r.id)).size, 60);
});
test('isolamento entre contas e bloqueio de papéis de consulta e voluntário', async () => {
  await create(); const r = (await requests()).items[0];
  assert.equal((await api.manage(manager('other'), { action: 'listCampaigns' })).items.length, 0);
  for (const action of ['getCampaign', 'listRequests', 'getResponse', 'review', 'archiveCampaign']) await assert.rejects(api.manage(manager('other'), { action, id: 'campaign1', requestId: r.id, status: 'CANCELADA' }), /não encontrada/);
  for (const role of ['branchViewer', 'volunteer']) await assert.rejects(api.manage({ uid: 'owner', token: { role, status: 'active' } }, { action: 'listCampaigns' }), /superadministradores/);
  await assert.rejects(api.manage(null, { action: 'listCampaigns' }));
});
test('link geral gera token próprio por participante e retoma sessão sem duplicar', async () => {
  await create({ mode: 'general', recipients: [] }); const c = await api.manage(manager('owner'), { action: 'getCampaign', id: 'campaign1' });
  const publicView = await api.public({ action: 'open', token: c.generalToken }); assert.equal(publicView.kind, 'general'); assert.equal(publicView.recipientCount, undefined);
  const a = await api.public({ action: 'join', token: c.generalToken, name: 'Ana', session: 'a'.repeat(64) });
  const b = await api.public({ action: 'join', token: c.generalToken, name: 'Bia', session: 'b'.repeat(64) }); assert.notEqual(a.token, b.token);
  assert.deepEqual(await api.public({ action: 'join', token: c.generalToken, name: 'Ana', session: 'a'.repeat(64) }), a);
  await api.public({ action: 'submit', token: a.token, answers }); assert.equal((await requests()).items.length, 2);
  await db.doc('formAccounts/owner/campaigns/campaign1').update({ recipientCount: 200 });
  await assert.rejects(api.public({ action: 'join', token: c.generalToken, name: 'C', session: 'c'.repeat(64) }), /limite/);
});
test('regras negam leitura, listagem e escrita direta mesmo com token ou autenticação', async () => {
  await create(); const tokenDoc = (await db.collection('formTokens').limit(1).get()).docs[0];
  const r = (await requests()).items[0];
  await api.public({ action: 'submit', token: r.token, answers });
  const paths = ['formAccounts/owner/campaigns/campaign1', tokenDoc.ref.path, 'formAccounts/owner/campaigns/campaign1/definition/snapshot', `formAccounts/owner/campaigns/campaign1/requests/${r.id}`, `formAccounts/owner/campaigns/campaign1/responses/${r.id}`];
  for (const context of [environment.unauthenticatedContext(), environment.authenticatedContext('owner', manager('owner').token), environment.authenticatedContext('other', manager('other').token)]) {
    const client = context.firestore();
    for (const path of paths) { await assertFails(getDoc(doc(client, path))); await assertFails(setDoc(doc(client, path), { injected: true })); }
    await assertFails(getDocs(collection(client, 'formTokens'))); await assertFails(getDocs(collection(client, 'formAccounts/owner/campaigns')));
  }
});
