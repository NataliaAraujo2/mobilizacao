import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatPhone } from '../../functions/contactFields.js';
import { createVolunteerAccount, enrollInAction, listPublicActions, loginVolunteer, refreshVolunteerSession, removeCurrentAccount } from '../services/publicVolunteerService';
import styles from './PublicActionsPanel.module.css';

const EMPTY = { fullName: '', email: '', password: '', phone: '', cpf: '', rg: '', birthDate: '' };

export default function PublicActionsPanel({ state, user, claims }) {
  const navigate = useNavigate();
  const [actions, setActions] = useState([]);
  const [selected, setSelected] = useState(null);
  const [mode, setMode] = useState('signup');
  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setSelected(null); setError('');
    if (!state) { setActions([]); return; }
    let current = true; setLoading(true);
    listPublicActions(state).then(items => { if (current) setActions(items); }).catch(() => { if (current) setError('Não foi possível carregar as ações deste estado.'); }).finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, [state]);

  async function enrollWithOptionalSwap(action, profile) {
    try { return await enrollInAction(action.id, profile); }
    catch (err) {
      const conflict = err.details;
      if ((err.code === 'functions/already-exists' || err.code === 'already-exists') && conflict?.conflictActionId && window.confirm(`Você já está inscrito em “${conflict.conflictActionName}” nesta data. Deseja trocar sua participação para “${action.name}”?`)) {
        return enrollInAction(action.id, undefined, conflict.conflictActionId);
      }
      throw err;
    }
  }

  async function joinExisting(action) {
    setLoading(true); setError('');
    try { await enrollWithOptionalSwap(action); navigate('/voluntario'); }
    catch (err) { setError(err.message || 'Não foi possível realizar a inscrição.'); }
    finally { setLoading(false); }
  }

  async function submit(event) {
    event.preventDefault(); setLoading(true); setError(''); let credential;
    try {
      credential = mode === 'signup' ? await createVolunteerAccount(form.email, form.password) : await loginVolunteer(form.email, form.password);
      const result = await enrollWithOptionalSwap(selected, mode === 'signup' ? form : undefined);
      await refreshVolunteerSession(credential.user);
      if (result.created) window.location.assign('/voluntario');
      else navigate('/voluntario');
    } catch (err) {
      if (mode === 'signup' && credential?.user) await removeCurrentAccount(credential.user).catch(() => {});
      setError(err.message || 'Não foi possível concluir sua inscrição.');
    } finally { setLoading(false); }
  }

  if (!state) return null;
  return <section className={styles.panel} aria-live="polite"><h3>Ações disponíveis</h3>{loading && !selected ? <p>Carregando…</p> : actions.length === 0 ? <p>Não há ações abertas neste estado.</p> : <div className={styles.actions}>{actions.map(action => <article key={action.id}><h4>{action.name}</h4><p><strong>Data:</strong> {action.date.split('-').reverse().join('/')}</p><p>{action.address.city} · {action.address.street}, {action.address.number}</p>{action.whatToBring && <p><strong>O que levar:</strong> {action.whatToBring}</p>}<button type="button" onClick={() => user && claims?.role === 'volunteer' ? joinExisting(action) : setSelected(action)}>Quero participar</button></article>)}</div>}{selected && !user && <div className={styles.signup}><h3>Participar de {selected.name}</h3><div className={styles.tabs}><button type="button" onClick={() => setMode('signup')}>Primeiro acesso</button><button type="button" onClick={() => setMode('login')}>Já tenho conta</button></div><form onSubmit={submit}>{mode === 'signup' && <><label>Nome completo<input required value={form.fullName} onChange={e => setForm({ ...form, fullName: e.target.value })} /></label><label>Telefone<input required value={form.phone} onChange={e => setForm({ ...form, phone: formatPhone(e.target.value) })} /></label><label>CPF<input required inputMode="numeric" value={form.cpf} onChange={e => setForm({ ...form, cpf: e.target.value })} /></label><label>RG<input required value={form.rg} onChange={e => setForm({ ...form, rg: e.target.value })} /></label><label>Data de nascimento<input required type="date" value={form.birthDate} onChange={e => setForm({ ...form, birthDate: e.target.value })} /></label></>}<label>E-mail<input required type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></label><label>Senha<input required type="password" minLength="8" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} /></label><button disabled={loading}>{loading ? 'Concluindo…' : mode === 'signup' ? 'Criar conta e participar' : 'Entrar e participar'}</button></form></div>}{selected && user && claims?.role !== 'volunteer' && <p className={styles.error}>Saia da conta administrativa para entrar como voluntário.</p>}{error && <p className={styles.error}>{error}</p>}</section>;
}
