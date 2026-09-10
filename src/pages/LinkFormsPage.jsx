import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import FormBuilder from '../components/LinkForms/FormBuilder';
import { blankForm } from '../domain/forms/editorModel';
import FormFields from '../components/LinkForms/FormFields';
import { formLink, manageForms } from '../services/linkFormsService';
import { listVolunteersPage } from '../services/volunteersService';
import { listBranchContactsPage } from '../services/branchViewersService';
import { LIMITS, STATUSES, validateDefinition, validateRecipients, whatsappMessage, whatsappUrl } from '../../functions/formDomain';
import styles from '../components/LinkForms/LinkForms.module.css';

const localDate = days => { const d = new Date(Date.now() + days * 86400000); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0,16); };

function RecipientImport({ onAdd, run }) {
  const [search, setSearch] = useState(''); const [result, setResult] = useState(null);
  const [source, setSource] = useState('branches');
  const branches = source === 'branches';
  async function load(cursor = null) { await run(async () => setResult(await (branches ? listBranchContactsPage({ search, cursor }) : listVolunteersPage({ search, cursor, pageSize: 25 })))); }
  return <section className={styles.card}>
    <h3>Adicionar pessoas cadastradas</h3><p>Escolha uma lista para encontrar os destinatários da campanha.</p>
    <label>Buscar em<select value={source} onChange={e => { setSource(e.target.value); setSearch(''); setResult(null); }}><option value="branches">Responsáveis das filiais</option><option value="volunteers">Voluntários</option></select></label>
    <label>{branches ? 'Nome do responsável' : 'Nome do voluntário'}<input value={search} onChange={e => { setSearch(e.target.value); setResult(null); }} placeholder="Digite o início do nome ou deixe vazio" /></label>
    <p>Busca pelo início do nome, respeitando maiúsculas e minúsculas.{branches && ' Os contatos vêm do cadastro de acessos das filiais.'}</p>
    <button type="button" onClick={() => load()}>{branches ? 'Buscar responsáveis' : 'Buscar voluntários'}</button>
    {result && <><p>{result.data.length ? 'Adicione as pessoas que devem receber o formulário.' : 'Nenhuma pessoa encontrada nesta busca.'}</p>{result.data.map(v => <div className={styles.recipientRow} key={v.id}><span><strong>{v.fullName}</strong><small>{v.branchLabel ? `${v.branchLabel} · ` : ''}{v.phone || 'Sem telefone'}</small></span><button type="button" onClick={() => onAdd(v)}>Adicionar {v.fullName}</button></div>)}{result.hasMore && <button type="button" onClick={() => load(result.cursor)}>Próximas 25 pessoas</button>}</>}
  </section>;
}

function CampaignDetail({ initial, run, onClose }) {
  const [campaign, setCampaign] = useState(initial); const [status, setStatus] = useState(''); const [archived, setArchived] = useState(false);
  const [page, setPage] = useState({ items: [], cursor: null }); const [loading, setLoading] = useState(true); const [error, setError] = useState('');
  const [review, setReview] = useState(null);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let current = true; setLoading(true); setError('');
    manageForms('listRequests', { id: campaign.id, status, archived }).then(result => { if (current) setPage(result); }).catch(e => { if (current) setError(e.message); }).finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, [campaign.id, status, archived, revision]);
  async function refresh() { setCampaign(await manageForms('getCampaign', { id: campaign.id })); setRevision(v => v + 1); }
  async function change(r, next) {
    if (['CANCELADA', 'ARCHIVE'].includes(next) && !window.confirm(next === 'ARCHIVE' ? 'Arquivar esta solicitação?' : 'Cancelar este link? Ele não aceitará novas respostas.')) return;
    await run(async () => { await manageForms('review', { id: campaign.id, requestId: r.id, status: next }); setReview(null); await refresh(); }, 'Solicitação atualizada.');
  }
  const copy = value => run(() => navigator.clipboard.writeText(value), 'Copiado.');
  return <section>
    <button type="button" onClick={onClose}>← Voltar à central</button><h1>{campaign.title}</h1><p>{campaign.description}</p>
    <p>Formulário: {campaign.formTitle} · Criada em {new Date(campaign.createdAt).toLocaleDateString('pt-BR')} · Validade: {new Date(campaign.expiresAt).toLocaleString('pt-BR')}</p>
    <p>{campaign.recipientCount} destinatários · {campaign.responseCount} respostas recebidas {campaign.archived && '· Campanha arquivada'}</p>
    <div className={styles.toolbar}><button onClick={() => run(refresh)}>Atualizar indicadores e fila</button>{campaign.generalToken && <button onClick={() => copy(formLink(campaign.generalToken))}>Copiar link geral</button>}{!campaign.archived && <button onClick={() => { if (window.confirm('Arquivar a campanha? Todos os links deixarão de aceitar respostas. O histórico será preservado.')) run(async () => { await manageForms('archiveCampaign', { id: campaign.id }); await refresh(); }, 'Campanha arquivada.'); }}>Arquivar campanha</button>}</div>
    <h2>Fila de envios e respostas</h2><p>O WhatsApp abre com a mensagem pronta. Confirme o envio manualmente na conversa.</p>
    <label>Filtrar por status<select value={status} onChange={e => { setReview(null); setStatus(e.target.value); }}><option value="">Todos os status</option>{STATUSES.map(s => <option key={s}>{s}</option>)}</select></label>
    <label className={styles.check}><input type="checkbox" checked={archived} onChange={e => setArchived(e.target.checked)} />Mostrar solicitações arquivadas</label>
    {error && <p role="alert" className={styles.error}>{error}</p>}
    {loading ? <p role="status">Carregando solicitações…</p> : <>
      {!page.items.length && <p className={styles.notice}>Nenhuma solicitação neste filtro.</p>}
      {page.items.map(r => {
        const link = formLink(r.token); const message = whatsappMessage(r.name, campaign.formTitle, link); const whatsapp = whatsappUrl(r.phone, message);
        return <article className={styles.card} key={r.id}><h3>{r.name}</h3><p>{r.phone || 'Sem telefone'} · <span className={styles.badge}>{r.status}</span></p>
          <div className={styles.toolbar}>
            {whatsapp && r.status === 'PENDENTE' && !campaign.archived ? <a className={styles.buttonLink} href={whatsapp} target="_blank" rel="noopener noreferrer">Abrir WhatsApp</a> : <button disabled>Abrir WhatsApp{!r.phone ? ' (sem telefone)' : ''}</button>}
            <button onClick={() => copy(message)}>Copiar mensagem</button><button onClick={() => copy(link)}>Copiar link</button>
            {r.status !== 'CANCELADA' && <button onClick={() => change(r, 'CANCELADA')}>Cancelar link</button>}
            {r.submittedAt && <button onClick={() => run(async () => setReview({ request: r, response: await manageForms('getResponse', { id: campaign.id, requestId: r.id }) }))}>Revisar resposta</button>}
            {!r.archived && r.status !== 'PENDENTE' && <button onClick={() => change(r, 'ARCHIVE')}>Arquivar</button>}
          </div>
          {review?.request.id === r.id && <section aria-label={`Resposta de ${r.name}`}><h3>Resposta de {r.name}</h3><p>Recebida em {new Date(review.response.submittedAt).toLocaleString('pt-BR')}</p><FormFields definition={campaign.definition} answers={review.response.answers} readOnly />
            <div className={styles.toolbar}>{['RESPONDIDA', 'APROVADA', 'REJEITADA'].includes(r.status) && <><button onClick={() => change(r, 'APROVADA')}>Aprovar</button><button onClick={() => change(r, 'REJEITADA')}>Rejeitar</button></>}<button onClick={() => setReview(null)}>Fechar resposta</button></div></section>}
        </article>;
      })}
      {page.cursor && <button onClick={() => run(async () => { setReview(null); setPage(await manageForms('listRequests', { id: campaign.id, status, archived, cursor: page.cursor })); })}>Próximas 25 solicitações</button>}
    </>}
  </section>;
}

export default function LinkFormsPage() {
  const [tab, setTab] = useState('campaigns'); const [archived, setArchived] = useState(false);
  const [page, setPage] = useState({ items: [], cursor: null }); const [revision, setRevision] = useState(0);
  const [definition, setDefinition] = useState(blankForm); const [templateId, setTemplateId] = useState(null);
  const [campaign, setCampaign] = useState(null); const [busy, setBusy] = useState(false); const [message, setMessage] = useState(''); const [error, setError] = useState('');
  const [title, setTitle] = useState(''); const [description, setDescription] = useState(''); const [expiresAt, setExpiresAt] = useState(() => localDate(30));
  const [mode, setMode] = useState('individual'); const [recipients, setRecipients] = useState(''); const [creationId, setCreationId] = useState(() => crypto.randomUUID());
  const listAction = tab === 'templates' ? 'listTemplates' : 'listCampaigns';
  useEffect(() => {
    if (tab === 'builder' || campaign) return;
    let current = true; setBusy(true); setError('');
    manageForms(listAction, { archived }).then(result => { if (current) setPage(result); }).catch(e => { if (current) setError(e.message); }).finally(() => { if (current) setBusy(false); });
    return () => { current = false; };
  }, [tab, archived, listAction, revision, campaign]);
  async function run(work, success = '') {
    setBusy(true); setError(''); setMessage('');
    try { await work(); setMessage(success); } catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  function start(def = blankForm(), id = null) {
    setDefinition(def); setTemplateId(id); setTitle(def.title); setExpiresAt(localDate(def.validityDays)); setCreationId(crypto.randomUUID()); setRecipients(''); setDescription(''); setTab('builder'); setMessage('');
  }
  async function createCampaign() {
    await run(async () => {
      const valid = validateDefinition(definition);
      const parsed = mode === 'individual' ? validateRecipients(recipients.split('\n').filter(l => l.trim()).map(line => { const [name, phone = '', ...extra] = line.split(';'); if (extra.length) throw new Error('Use Nome; telefone, um por linha.'); return { name: name.trim(), phone: phone.trim() }; })) : [];
      const result = await manageForms('createCampaign', { id: creationId, title: title || valid.title, description, definition: valid, expiresAt: new Date(expiresAt).getTime(), mode, recipients: parsed });
      setCampaign(await manageForms('getCampaign', { id: result.id })); setTab('campaigns'); setCreationId(crypto.randomUUID());
    }, 'Campanha criada. Os links estão disponíveis na fila.');
  }
  return <main className={styles.page}>
    <Link to="/admin">← Minha área</Link>
    {message && <p role="status" className={styles.success}>{message}</p>}{error && <p role="alert" className={styles.error}>{error}</p>}
    <fieldset disabled={busy} className={styles.choices} aria-busy={busy}>
      {campaign ? <CampaignDetail key={campaign.id} initial={campaign} run={run} onClose={() => { setCampaign(null); setRevision(v => v + 1); }} /> : <>
        <h1>Formulários por link</h1><p>Crie perguntas, compartilhe links e acompanhe cada resposta.</p>
        <nav className={styles.toolbar} aria-label="Central de formulários"><button aria-pressed={tab === 'campaigns'} onClick={() => setTab('campaigns')}>Campanhas</button><button aria-pressed={tab === 'templates'} onClick={() => setTab('templates')}>Modelos</button><button onClick={() => { if (tab !== 'builder' || window.confirm('Descartar a edição atual e criar um formulário em branco?')) start(); }}>Criar formulário em branco</button>{tab !== 'builder' && <button onClick={() => setTab('builder')}>Retomar construtor</button>}</nav>
        {tab === 'builder' ? <>
          <FormBuilder value={definition} onChange={setDefinition} />
          <div className={styles.toolbar}><button onClick={() => run(async () => { const result = await manageForms('saveTemplate', { id: templateId, definition: validateDefinition(definition) }); setTemplateId(result.id); }, 'Modelo salvo. Campanhas já enviadas permanecem com a versão original.')}>{templateId ? 'Salvar alterações no modelo' : 'Salvar como modelo'}</button>{templateId && <button onClick={() => run(async () => { const result = await manageForms('saveTemplate', { definition: validateDefinition(definition) }); setTemplateId(result.id); }, 'Cópia do modelo salva.')}>Salvar como novo modelo</button>}</div>
          <section className={styles.card}><h2>Gerar campanha</h2><label>Título da campanha<input maxLength={160} value={title} onChange={e => setTitle(e.target.value)} placeholder={definition.title} /></label><label>Descrição da campanha<textarea maxLength={3000} value={description} onChange={e => setDescription(e.target.value)} /></label><label>Prazo de validade<input type="datetime-local" value={expiresAt} onChange={e => setExpiresAt(e.target.value)} /></label><button onClick={() => setExpiresAt(localDate(definition.validityDays))}>Usar validade padrão do formulário</button><label>Tipo de link<select value={mode} onChange={e => setMode(e.target.value)}><option value="individual">Um link por destinatário</option><option value="general">Um link geral compartilhável</option></select></label>
            {mode === 'individual' ? <><label>Destinatários — um por linha: Nome; telefone (opcional)<textarea rows={6} maxLength={33000} value={recipients} onChange={e => setRecipients(e.target.value)} placeholder={'Maria; 11999999999\nJoão'} /></label><p>{recipients.split('\n').filter(l => l.trim()).length}/{LIMITS.recipients} destinatários</p></> : <p>Compartilhe o mesmo endereço. Cada participante informa o nome e recebe uma solicitação própria. Limite: {LIMITS.recipients} participantes.</p>}
          </section>
          {mode === 'individual' && <RecipientImport run={run} onAdd={v => { const lines = recipients.split('\n').filter(l => l.trim()); if (lines.length >= LIMITS.recipients) { setError(`Limite de ${LIMITS.recipients} destinatários.`); return; } const line = `${v.fullName.replaceAll(';', ',')}; ${v.phone || ''}`; if (!lines.includes(line)) setRecipients([...lines, line].join('\n')); }} />}
          <button className={styles.primary} onClick={createCampaign}>Gerar campanha e links</button>
        </> : <>
          <label className={styles.check}><input type="checkbox" checked={archived} onChange={e => setArchived(e.target.checked)} />Mostrar {tab === 'templates' ? 'modelos arquivados' : 'campanhas arquivadas'}</label>
          {!busy && !page.items.length && <p className={styles.notice}>Nenhum registro encontrado. Crie um formulário em branco para começar.</p>}
          <div className={styles.grid}>{page.items.map(item => <article className={styles.card} key={item.id}><h2>{item.title}</h2><p>Criado em {new Date(item.createdAt).toLocaleDateString('pt-BR')}</p>{tab === 'campaigns' ? <><p>{item.recipientCount} destinatários · {item.responseCount} respostas</p><p>Prazo: {new Date(item.expiresAt).toLocaleString('pt-BR')}</p><button onClick={() => run(async () => setCampaign(await manageForms('getCampaign', { id: item.id })))}>Abrir campanha</button></> : <div className={styles.toolbar}><button onClick={() => run(async () => { const model = await manageForms('getTemplate', { id: item.id }); start(model.definition); })}>Usar modelo</button><button onClick={() => run(async () => { const model = await manageForms('getTemplate', { id: item.id }); start(model.definition, item.id); })}>Editar modelo</button><button onClick={() => run(async () => { const model = await manageForms('getTemplate', { id: item.id }); await manageForms('saveTemplate', { definition: { ...model.definition, title: `${model.definition.title.slice(0,150)} (cópia)` } }); setRevision(v => v + 1); }, 'Modelo duplicado.')}>Duplicar modelo</button>{!item.archived && <button onClick={() => { if (window.confirm('Arquivar este modelo? As campanhas enviadas serão preservadas.')) run(async () => { await manageForms('archiveTemplate', { id: item.id }); setRevision(v => v + 1); }, 'Modelo arquivado.'); }}>Arquivar modelo</button>}</div>}</article>)}</div>
          {page.cursor && <button onClick={() => run(async () => setPage(await manageForms(listAction, { archived, cursor: page.cursor })))}>Próximos 25 registros</button>}
        </>}
      </>}
    </fieldset>
    {busy && <p role="status">Processando…</p>}
  </main>;
}
