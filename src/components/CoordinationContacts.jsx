import { useEffect, useState } from 'react';
import { subscribeCoordinationContacts, saveCoordinationContacts } from '../services/coordinationContactsService';
import { formatPhone } from '../../functions/contactFields.js';
import styles from './CoordinationContacts.module.css';

function useContacts(branchId) {
  const [result, setResult] = useState({ branchId: '', contacts: null, loading: false, error: '' });
  useEffect(() => {
    if (!branchId) return undefined;
    let active = true;
    let unsubscribe;
    subscribeCoordinationContacts(branchId,
      contacts => { if (active) setResult({ branchId, contacts, loading: false, error: '' }); },
      () => { if (active) setResult({ branchId, contacts: null, loading: false, error: 'Não foi possível carregar os contatos da coordenação.' }); },
    ).then(stop => { if (active) unsubscribe = stop; else stop(); })
      .catch(() => { if (active) setResult({ branchId, contacts: null, loading: false, error: 'Não foi possível carregar os contatos da coordenação.' }); });
    return () => { active = false; unsubscribe?.(); };
  }, [branchId]);
  return result.branchId === branchId ? result : { contacts: null, loading: Boolean(branchId), error: '' };
}

function ContactValues({ contacts }) {
  if (!contacts?.phone && !contacts?.email) return <p>Nenhum contato público cadastrado para esta coordenação.</p>;
  return <div className={styles.values}>
    {contacts.phone && <a href={`tel:${contacts.phone}`}>Telefone: {formatPhone(contacts.phone)}</a>}
    {contacts.email && <a href={`mailto:${contacts.email}`}>E-mail: {contacts.email}</a>}
  </div>;
}

function ContactEditor({ branch }) {
  const { contacts, loading, error } = useContacts(branch.id);
  const [draft, setDraft] = useState(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [saveError, setSaveError] = useState('');
  const values = draft ?? { phone: contacts?.phone ?? '', email: contacts?.email ?? '' };
  async function save(event) {
    event.preventDefault();
    setBusy(true); setMessage(''); setSaveError('');
    try {
      await saveCoordinationContacts(branch.id, values);
      setDraft(null);
      setMessage('Contatos públicos salvos. As ações usarão os dados atualizados automaticamente.');
    } catch (failure) { setSaveError(failure.message || 'Não foi possível salvar os contatos.'); }
    finally { setBusy(false); }
  }
  return <form onSubmit={save} className={styles.editor}>
    <p>Estes contatos são públicos e aparecem nas ações desta coordenação. Os dados do responsável pelo acesso continuam privados.</p>
    {loading && <p role="status">Carregando contatos…</p>}
    <label>Telefone público da coordenação<input type="tel" maxLength="25" value={formatPhone(values.phone)} disabled={loading || busy} onChange={event => setDraft({ ...values, phone: event.target.value })} /></label>
    <label>E-mail público da coordenação<input type="email" maxLength="160" value={values.email} disabled={loading || busy} onChange={event => setDraft({ ...values, email: event.target.value })} /></label>
    {(error || saveError) && <p role="alert">{saveError || error}</p>}
    {message && <p role="status">{message}</p>}
    <button type="submit" disabled={loading || busy || Boolean(error)}>{busy ? 'Salvando…' : 'Salvar contatos públicos'}</button>
  </form>;
}

export function CoordinationContactsEditor({ branch }) {
  const [open, setOpen] = useState(false);
  return <section className={styles.box}>
    <button type="button" aria-expanded={open} onClick={() => setOpen(current => !current)}>{open ? 'Fechar contatos públicos da coordenação' : 'Cadastrar / editar contatos públicos da coordenação'}</button>
    {open && <ContactEditor branch={branch} />}
  </section>;
}

export function ActionContactFields({ form, setForm }) {
  const { contacts, loading, error } = useContacts(form.branchId);
  const [own, setOwn] = useState(Boolean(form.contactPhone || form.contactEmail));
  function choose(value) {
    setOwn(value);
    if (!value) setForm(current => ({ ...current, contactPhone: '', contactEmail: '' }));
  }
  return <div className={styles.box}>
    <h3>Contatos da coordenação</h3>
    {!form.branchId ? <p>Selecione a coordenação para visualizar os contatos cadastrados.</p> : loading ? <p role="status">Carregando contatos…</p> : error ? <p role="alert">{error}</p> : <ContactValues contacts={contacts} />}
    {form.branchId && !loading && !error && !contacts?.phone && !contacts?.email && <p className={styles.notice}>Cadastre os contatos públicos da coordenação em “Coordenações estaduais” ou “Acessos das coordenações”. Os dados privados do responsável não serão usados.</p>}
    <label>Esta ação tem contato próprio ou usaremos o contato da coordenação?
      <select value={own ? 'own' : 'coordination'} onChange={event => choose(event.target.value === 'own')}>
        <option value="coordination">Usar os contatos da coordenação</option>
        <option value="own">Informar contatos próprios da ação</option>
      </select>
    </label>
    {!own && <p>Usaremos os contatos acima, sempre atualizados. Eles não serão copiados para a ação.</p>}
    {own && <>
      <p>Os contatos da ação aparecerão junto com os contatos da coordenação. Se deixar ambos vazios, serão exibidos somente os da coordenação.</p>
      <label>Telefone da ação<input type="tel" maxLength="25" value={form.contactPhone} onChange={event => setForm(current => ({ ...current, contactPhone: event.target.value }))} /></label>
      <label>E-mail da ação<input type="email" maxLength="160" value={form.contactEmail} onChange={event => setForm(current => ({ ...current, contactEmail: event.target.value }))} /></label>
    </>}
  </div>;
}

export function PublicActionContacts({ action }) {
  const { contacts, loading, error } = useContacts(action.branchId);
  const visible = contacts?.status === 'active' ? contacts : null;
  return <div className={styles.box}>
    {loading && <p role="status">Carregando contatos da coordenação…</p>}
    {error && <p role="status">{error}</p>}
    {(visible?.phone || visible?.email) && <section><h4>Contatos da coordenação{visible.name ? ` — ${visible.name}` : ''}</h4><ContactValues contacts={visible} /></section>}
    {(action.contactPhone || action.contactEmail) && <section><h4>Contatos da ação</h4><ContactValues contacts={{ phone: action.contactPhone?.replace(/\D/g, ''), email: action.contactEmail }} /></section>}
  </div>;
}
