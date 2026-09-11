import { randomBytes, createHash } from 'node:crypto';
import { FieldPath, FieldValue } from 'firebase-admin/firestore';
import { assertPending, effectiveStatus, ensure, LIMITS, requireManager, STATUSES, validateAnswers, validateDefinition, validateRecipients } from './formDomain.js';

const token = () => randomBytes(32).toString('hex');
const hash = value => createHash('sha256').update(value).digest('hex');
function id(value) { ensure(typeof value === 'string' && /^[\w-]{1,80}$/.test(value), 'Identificador inválido.'); return value; }
function validToken(value) { ensure(typeof value === 'string' && /^[a-f0-9]{64}$/.test(value), 'Link inválido.'); return value; }
function boundedText(value, max = 160) { ensure(typeof value === 'string' && value.trim() && value.length <= max, 'Texto inválido.'); return value.trim(); }

// All reads/writes go through this API; Firestore clients have no access to these collections.
export function createFormsApi(db, now = () => Date.now()) {
  const account = uid => db.collection('formAccounts').doc(uid);
  const campaignRef = (uid, cid) => account(uid).collection('campaigns').doc(id(cid));
  async function campaign(uid, cid) {
    const ref = campaignRef(uid, cid); const snap = await ref.get();
    ensure(snap.exists, 'Campanha não encontrada.'); return { ref, data: snap.data() };
  }
  async function resolve(rawToken) {
    const snap = await db.collection('formTokens').doc(hash(validToken(rawToken))).get();
    ensure(snap.exists, 'Link inválido.');
    const link = snap.data(); const c = await campaign(link.ownerId, link.campaignId);
    return { link, ...c };
  }
  async function page(query, cursor) {
    let q = query.orderBy(FieldPath.documentId());
    if (cursor) q = q.startAfter(id(cursor));
    const snap = await q.limit(26).get(); const docs = snap.docs.slice(0,25);
    return { items: docs.map(d => ({ ...d.data(), id: d.id })), cursor: snap.size > 25 ? docs.at(-1).id : null };
  }
  return {
    async manage(auth, input) {
      const uid = requireManager(auth); const data = input ?? {}; const root = account(uid);
      switch (data.action) {
        case 'listTemplates': return page(root.collection('templates').where('archived', '==', !!data.archived), data.cursor);
        case 'getTemplate': {
          const ref = root.collection('templates').doc(id(data.id));
          const [meta, definition] = await Promise.all([ref.get(), ref.collection('definition').doc('current').get()]);
          ensure(meta.exists && definition.exists, 'Modelo não encontrado.');
          return { ...meta.data(), id: ref.id, definition: definition.data() };
        }
        case 'saveTemplate': {
          const definition = validateDefinition(data.definition);
          const ref = root.collection('templates').doc(data.id ? id(data.id) : db.collection('unused').doc().id);
          await db.runTransaction(async tx => {
            const existing = await tx.get(ref);
            if (data.id) ensure(existing.exists, 'Modelo não encontrado.');
            tx.set(ref, { title: definition.title, archived: false, createdAt: existing.data()?.createdAt ?? now(), updatedAt: now() });
            tx.set(ref.collection('definition').doc('current'), definition);
          });
          return { id: ref.id };
        }
        case 'deleteTemplate': {
          const ref = root.collection('templates').doc(id(data.id)); ensure((await ref.get()).exists, 'Modelo não encontrado.'); await db.recursiveDelete(ref); return { ok: true };
        }
        case 'archiveTemplate': {
          const ref = root.collection('templates').doc(id(data.id));
          await ref.update({ archived: true, updatedAt: now() }); return { ok: true };
        }
        case 'listCampaigns': return page(root.collection('campaigns').where('archived', '==', !!data.archived), data.cursor);
        case 'createCampaign': {
          const definition = validateDefinition(data.definition);
          const title = boundedText(data.title); const description = data.description ?? ''; const message = typeof data.whatsappMessage === 'string' ? data.whatsappMessage.trim() : '';
          ensure(typeof description === 'string' && description.length <= 3000, 'Descrição inválida.');
          ensure(message.length <= 3000, 'Mensagem do WhatsApp acima do limite.');
          const expiresAt = Number(data.expiresAt);
          ensure(Number.isFinite(expiresAt) && expiresAt > now() && expiresAt <= now() + 366 * 86400000, 'Prazo inválido.');
          ensure(['individual', 'general'].includes(data.mode), 'Modo de envio inválido.');
          const recipients = data.mode === 'individual' ? validateRecipients(data.recipients) : [];
          const collectBranch = data.mode === 'general' && data.collectBranch === true;
          const branchOptions = collectBranch ? (await db.collection('branches').get()).docs.filter(d => d.data().status === 'active').map(d => ({ id: d.id, name: d.data().name })).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')) : [];
          ensure(!collectBranch || branchOptions.length > 0, 'Cadastre uma filial ativa antes de solicitar a filial.');
          const ref = campaignRef(uid, data.id); const generalToken = data.mode === 'general' ? token() : null;
          await db.runTransaction(async tx => {
            const existing = await tx.get(ref);
            // A retry of the same creation never creates a second campaign or replaces a snapshot.
            if (existing.exists) return;
            tx.create(ref, { collectBranch, branchOptions, title, description, whatsappMessage: message, formTitle: definition.title, createdAt: now(), expiresAt, mode: data.mode, recipientCount: recipients.length, responseCount: 0, archived: false, generalToken });
            tx.create(ref.collection('definition').doc('snapshot'), definition);
            if (generalToken) tx.create(db.collection('formTokens').doc(hash(generalToken)), { ownerId: uid, campaignId: ref.id, kind: 'general' });
            for (const recipient of recipients) {
              const requestRef = ref.collection('requests').doc(); const secret = token();
              tx.create(requestRef, { ...recipient, token: secret, status: 'PENDENTE', archived: false, createdAt: now() });
              tx.create(db.collection('formTokens').doc(hash(secret)), { ownerId: uid, campaignId: ref.id, requestId: requestRef.id, kind: 'individual' });
            }
          });
          return { id: ref.id };
        }
        case 'getCampaign': {
          const c = await campaign(uid, data.id); const definition = await c.ref.collection('definition').doc('snapshot').get();
          return { ...c.data, id: c.ref.id, definition: definition.data() };
        }
        case 'listRequests': {
          const c = await campaign(uid, data.id);
          let q = c.ref.collection('requests').where('archived', '==', !!data.archived);
          if (data.status) {
            ensure(STATUSES.includes(data.status), 'Status inválido.');
            if ((data.status === 'EXPIRADA' && (c.data.expiresAt > now() || c.data.archived)) || (data.status === 'PENDENTE' && (c.data.expiresAt <= now() || c.data.archived))) return { items: [], cursor: null };
            q = data.status === 'CANCELADA' && c.data.archived ? q.where('status', 'in', ['PENDENTE', 'CANCELADA']) : q.where('status', '==', data.status === 'EXPIRADA' ? 'PENDENTE' : data.status);
          }
          const result = await page(q, data.cursor);
          return { ...result, items: result.items.map(r => ({ ...r, status: effectiveStatus(r, c.data, now()) })) };
        }
        case 'getResponse': {
          const c = await campaign(uid, data.id);
          const snap = await c.ref.collection('responses').doc(id(data.requestId)).get();
          ensure(snap.exists, 'Resposta não encontrada.'); return snap.data();
        }
        case 'review': {
          const ref = campaignRef(uid, data.id); const r = ref.collection('requests').doc(id(data.requestId));
          ensure(['APROVADA', 'REJEITADA', 'CANCELADA', 'ARCHIVE'].includes(data.status), 'Operação inválida.');
          await db.runTransaction(async tx => {
            const [cs, rs] = await Promise.all([tx.get(ref), tx.get(r)]);
            ensure(cs.exists && rs.exists, 'Solicitação não encontrada.'); const current = rs.data();
            if (data.status === 'ARCHIVE') {
              ensure(effectiveStatus(current, cs.data(), now()) !== 'PENDENTE', 'Cancele o link pendente antes de arquivar.');
              tx.update(r, { archived: true, reviewedBy: uid, reviewedAt: now() }); return;
            }
            if (data.status === 'CANCELADA') ensure(current.status !== 'CANCELADA', 'Link já cancelado.');
            else ensure(['RESPONDIDA', 'APROVADA', 'REJEITADA'].includes(current.status), 'Somente respostas recebidas podem ser revisadas.');
            tx.update(r, { status: data.status, reviewedBy: uid, reviewedAt: now() });
          }); return { ok: true };
        }
        case 'deleteCampaign': {
          const ref = campaignRef(uid, data.id); ensure((await ref.get()).exists, 'Campanha não encontrada.');
          const tokens = await db.collection('formTokens').where('ownerId', '==', uid).where('campaignId', '==', ref.id).get(); const batch = db.batch(); tokens.docs.forEach(item => batch.delete(item.ref)); await batch.commit(); await db.recursiveDelete(ref); return { ok: true };
        }
        case 'archiveCampaign': {
          const c = await campaign(uid, data.id); await c.ref.update({ archived: true }); return { ok: true };
        }
        default: ensure(false, 'Operação inválida.');
      }
    },
    async public(input) {
      const data = input ?? {};
      ensure(['open', 'join', 'submit'].includes(data.action), 'Operação inválida.');
      ensure(Object.keys(data).every(k => ['action', 'token', 'name', 'session', 'answers', 'branchId'].includes(k)), 'Campo não solicitado.');
      const c = await resolve(data.token);
      if (c.link.kind === 'general') {
        assertPending({ status: 'PENDENTE' }, c.data, now());
        if (data.action === 'open') return { kind: 'general', title: c.data.title, description: c.data.description, collectBranch: !!c.data.collectBranch, branches: c.data.branchOptions ?? [], expiresAt: c.data.expiresAt };
        ensure(data.action === 'join', 'Link geral requer identificação.');
        const name = boundedText(data.name, 120); const session = validToken(data.session);
        const r = c.ref.collection('requests').doc(hash(session));
        return db.runTransaction(async tx => {
          const [cs, rs] = await Promise.all([tx.get(c.ref), tx.get(r)]);
          assertPending({ status: 'PENDENTE' }, cs.data(), now());
          if (rs.exists) return { token: rs.data().token };
          ensure(cs.data().recipientCount < LIMITS.recipients, 'Esta campanha atingiu o limite de participantes.');
          const branch = cs.data().collectBranch ? cs.data().branchOptions.find(b => b.id === data.branchId) : null;
          ensure(!cs.data().collectBranch || branch, 'Selecione uma filial válida.');
          const secret = token();
          tx.create(r, { branchId: branch?.id ?? null, branchName: branch?.name ?? '', name, phone: '', token: secret, status: 'PENDENTE', archived: false, createdAt: now() });
          tx.create(db.collection('formTokens').doc(hash(secret)), { ownerId: c.link.ownerId, campaignId: c.ref.id, requestId: r.id, kind: 'individual' });
          tx.update(c.ref, { recipientCount: FieldValue.increment(1) });
          return { token: secret };
        });
      }
      const r = c.ref.collection('requests').doc(c.link.requestId);
      if (data.action === 'open') {
        const [rs, definition] = await Promise.all([r.get(), c.ref.collection('definition').doc('snapshot').get()]);
        ensure(rs.exists, 'Link inválido.'); assertPending(rs.data(), c.data, now());
        return { kind: 'individual', name: rs.data().name, definition: definition.data(), expiresAt: c.data.expiresAt };
      }
      ensure(data.action === 'submit' && !Object.hasOwn(data, 'name') && !Object.hasOwn(data, 'session') && !Object.hasOwn(data, 'branchId'), 'Campo não solicitado.');
      return db.runTransaction(async tx => {
        const responseRef = c.ref.collection('responses').doc(r.id);
        const [cs, rs, definition, response] = await Promise.all([tx.get(c.ref), tx.get(r), tx.get(c.ref.collection('definition').doc('snapshot')), tx.get(responseRef)]);
        ensure(rs.exists && cs.exists && definition.exists, 'Link inválido.'); assertPending(rs.data(), cs.data(), now());
        ensure(!response.exists, 'Este link já foi respondido.');
        const answers = validateAnswers(definition.data(), data.answers);
        tx.create(responseRef, { answers, submittedAt: now(), requestId: r.id });
        tx.update(r, { status: 'RESPONDIDA', submittedAt: now() });
        tx.update(c.ref, { responseCount: FieldValue.increment(1) });
        return { ok: true };
      });
    },
  };
}
