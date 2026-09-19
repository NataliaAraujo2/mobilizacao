import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatPhone } from '../../functions/contactFields.js';
import { createVolunteerAccount, enrollInAction, getPublicAction, listPublicActions, loginVolunteer, refreshVolunteerSession, removeCurrentAccount } from '../services/publicVolunteerService';
import styles from './PublicActionsPanel.module.css';
import { actionScheduleSummary } from '../domain/actions/actionSchedule';
import { NGO_RELATIONSHIPS, SHIRT_SIZES } from '../domain/volunteers/volunteerModel';
import { BRAZIL_STATES } from '../domain/locations/brazilStates';
import VolunteerRegulation from './VolunteerRegulation';

const EMPTY_ADDRESS = { cep: '', street: '', number: '', complement: '', neighborhood: '', city: '', state: '' };
const EMPTY = { fullName: '', email: '', password: '', phone: '', cpf: '', rg: '', birthDate: '', address: EMPTY_ADDRESS, shirtSize: '', ngoRelationship: '', lgpdAccepted: false, regulationAccepted: false };
function formatCep(value) { return String(value ?? '').replace(/\D/g, '').slice(0, 8).replace(/(\d{5})(\d)/, '$1-$2'); }

export default function PublicActionsPanel({ state, user, claims, actionId = '' }) {
  const navigate = useNavigate();
  const [actions, setActions] = useState([]);
  const [selected, setSelected] = useState(null);
  const [mode, setMode] = useState('signup');
  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showRegulation, setShowRegulation] = useState(false);

  useEffect(() => {
    setSelected(null); setError('');
    if (!state && !actionId) { setActions([]); return; }
    let current = true; setLoading(true);
    const request = actionId ? getPublicAction(actionId) : listPublicActions(state);
    request.then(items => { if (current) { setActions(items); if (actionId) setSelected(items[0] ?? null); } }).catch(() => { if (current) setError('Não foi possível carregar esta ação.'); }).finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, [state, actionId]);

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

  if (!state && !actionId) return null;
  return <section className={styles.panel} aria-live="polite"><h3>Ações disponíveis</h3>{loading && !selected ? <p>Carregando…</p> : actions.length === 0 ? <p>Não há ações abertas neste estado.</p> : <div className={styles.actions}>{actions.map(action => <article key={action.id}><p className={styles.municipality}><strong>{action.address.city}</strong>{action.address.state ? ` · ${action.address.state}` : ''}</p><h4>{action.name}</h4><p><strong>Quando:</strong> {actionScheduleSummary(action)}</p><p>{action.address.street}, {action.address.number}</p>{action.description && <p>{action.description}</p>}{action.whatToBring && <p><strong>O que levar:</strong> {action.whatToBring}</p>}<button type="button" onClick={() => user && claims?.role === 'volunteer' ? joinExisting(action) : setSelected(action)}>Quero participar</button></article>)}</div>}{selected && !user && <div className={styles.signup}><p className={styles.municipality}><strong>{selected.address.city}</strong>{selected.address.state ? ` · ${selected.address.state}` : ''}</p><h3>{selected.name}</h3><div className={styles.tabs}><button type="button" onClick={() => setMode('signup')}>Primeiro acesso</button><button type="button" onClick={() => setMode('login')}>Já tenho conta</button></div><form onSubmit={submit}>{mode === 'signup' && <><label>Nome completo<input required value={form.fullName} onChange={e => setForm({ ...form, fullName: e.target.value })} /></label><label>Telefone<input required value={form.phone} onChange={e => setForm({ ...form, phone: formatPhone(e.target.value) })} /></label><label>CPF<input required inputMode="numeric" value={form.cpf} onChange={e => setForm({ ...form, cpf: e.target.value })} /></label><label>RG<input required value={form.rg} onChange={e => setForm({ ...form, rg: e.target.value })} /></label><label>Data de nascimento<input required type="date" value={form.birthDate} onChange={e => setForm({ ...form, birthDate: e.target.value })} /></label><fieldset className={styles.address}><legend>Endereço</legend><label>CEP<input required inputMode="numeric" value={formatCep(form.address.cep)} onChange={e => setForm({ ...form, address: { ...form.address, cep: formatCep(e.target.value) } })} /></label><label>Logradouro<input required value={form.address.street} onChange={e => setForm({ ...form, address: { ...form.address, street: e.target.value } })} /></label><label>Número<input required value={form.address.number} onChange={e => setForm({ ...form, address: { ...form.address, number: e.target.value } })} /></label><label>Complemento <small>(opcional)</small><input value={form.address.complement} onChange={e => setForm({ ...form, address: { ...form.address, complement: e.target.value } })} /></label><label>Bairro<input required value={form.address.neighborhood} onChange={e => setForm({ ...form, address: { ...form.address, neighborhood: e.target.value } })} /></label><label>Cidade<input required value={form.address.city} onChange={e => setForm({ ...form, address: { ...form.address, city: e.target.value } })} /></label><label>Estado<select required value={form.address.state} onChange={e => setForm({ ...form, address: { ...form.address, state: e.target.value } })}><option value="">Selecione</option>{BRAZIL_STATES.map(state => <option key={state.code} value={state.code}>{state.code} — {state.name}</option>)}</select></label></fieldset><label>Tamanho da camiseta<select required value={form.shirtSize} onChange={e => setForm({ ...form, shirtSize: e.target.value })}><option value="">Selecione</option>{SHIRT_SIZES.map(size => <option key={size} value={size}>{size}</option>)}</select></label><label>Vínculo com a ONG<select required value={form.ngoRelationship} onChange={e => setForm({ ...form, ngoRelationship: e.target.value })}><option value="">Selecionе…</option>{NGO_RELATIONSHIPS.map(item => <option key={item} value={item}>{item}</option>)}</select></label><label className={styles.acceptance}><input required type="checkbox" checked={form.lgpdAccepted} onChange={e => setForm({ ...form, lgpdAccepted: e.target.checked })} />Concordo com o uso dos meus dados conforme LGPD.</label><div className={styles.regulationAcceptance}><label className={styles.acceptance}><input required type="checkbox" checked={form.regulationAccepted} onChange={e => setForm({ ...form, regulationAccepted: e.target.checked })} />Concordo com o Regulamento do Voluntário.</label><button type="button" className={styles.regulationButton} onClick={() => setShowRegulation(true)}>Ver regulamento</button></div></>}<label>E-mail<input required type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></label><label>Senha<input required type="password" minLength="8" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} /></label><button disabled={loading}>{loading ? 'Concluindo…' : mode === 'signup' ? 'Criar conta e participar' : 'Entrar e participar'}</button></form></div>}{selected && user && claims?.role !== 'volunteer' && <p className={styles.error}>Saia da conta administrativa para entrar como voluntário.</p>}{error && <p className={styles.error}>{error}</p>}<VolunteerRegulation open={showRegulation} onClose={() => setShowRegulation(false)} /></section>;
}
