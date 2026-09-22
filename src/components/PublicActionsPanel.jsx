import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { formatPhone } from '../../functions/contactFields.js';
import { enrollInAction, getPublicAction, listPublicActions, loginVolunteer, refreshVolunteerSession, registerPublicVolunteer } from '../services/publicVolunteerService';
import styles from './PublicActionsPanel.module.css';
import { actionScheduleSummary } from '../domain/actions/actionSchedule';
import { isMinorBirthDate, NGO_RELATIONSHIPS, SHIRT_SIZES } from '../domain/volunteers/volunteerModel';
import { BRAZIL_STATES } from '../domain/locations/brazilStates';
import ActionPhotoGallery from './ActionPhotoGallery';
import VolunteerRegulation from './VolunteerRegulation';

const EMPTY_ADDRESS = { cep: '', street: '', number: '', complement: '', neighborhood: '', city: '', state: '' };
const EMPTY = { fullName: '', email: '', phone: '', cpf: '', rg: '', birthDate: '', address: EMPTY_ADDRESS, shirtSize: '', ngoRelationship: '', lgpdAccepted: false, regulationAccepted: false, imageUseAccepted: false, guardianAuthorizationAccepted: false };
const formatCep = value => String(value ?? '').replace(/\D/g, '').slice(0, 8).replace(/(\d{5})(\d)/, '$1-$2');
const enrollmentErrorMessage = error => ({
  'auth/invalid-credential': 'E-mail ou senha incorretos.',
  'auth/wrong-password': 'E-mail ou senha incorretos.',
  'auth/weak-password': 'A senha deve ter pelo menos 8 caracteres.',
  'auth/invalid-email': 'Informe um e-mail válido.',
  'auth/network-request-failed': 'Não foi possível conectar. Verifique sua internet e tente novamente.',
}[error?.code] || error?.message || 'Não foi possível concluir sua inscrição.');

export default function PublicActionsPanel({ state, user, claims, actionId = '' }) {
  const navigate = useNavigate();
  const [actions, setActions] = useState([]);
  const [selected, setSelected] = useState(null);
  const [showSignup, setShowSignup] = useState(false);
  const [mode, setMode] = useState('signup');
  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [confirmation, setConfirmation] = useState(null);
  const [showRegulation, setShowRegulation] = useState(false);

  useEffect(() => {
    setSelected(null); setShowSignup(false); setError(''); setConfirmation(null);
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
      if ((err.code === 'functions/already-exists' || err.code === 'already-exists') && conflict?.conflictActionId && window.confirm(`Você já está inscrito em “${conflict.conflictActionName}” nesta data. Deseja trocar sua participação para “${action.name}”?`)) return enrollInAction(action.id, undefined, conflict.conflictActionId);
      throw err;
    }
  }

  async function joinExisting(action) { setLoading(true); setError(''); try { await enrollWithOptionalSwap(action); setConfirmation({ actionName: action.name, newAccount: false }); } catch (err) { setError(enrollmentErrorMessage(err)); } finally { setLoading(false); } }
  async function submit(event) {
    event.preventDefault(); setLoading(true); setError('');
    try {
      if (mode === 'signup') {
        await registerPublicVolunteer(selected.id, form);
        setShowSignup(false);
        setConfirmation({ actionName: selected.name, publicRegistration: true });
      } else {
        const credential = await loginVolunteer(form.email, form.password);
        await enrollWithOptionalSwap(selected);
        await refreshVolunteerSession(credential.user);
        setShowSignup(false);
        setConfirmation({ actionName: selected.name, publicRegistration: false });
      }
    }
    catch (err) { setError(enrollmentErrorMessage(err)); }
    finally { setLoading(false); }
  }

  function openDetails(action) { setSelected(action); setShowSignup(false); setError(''); }
  function closeDetails() { setSelected(null); setShowSignup(false); setError(''); }
  function beginParticipation() {
    if (user && claims?.role === 'volunteer') return joinExisting(selected);
    if (user) return setError('Saia da conta administrativa para entrar como voluntário.');
    setShowSignup(true);
  }

  if (!state && !actionId) return null;
  const update = patch => setForm({ ...form, ...patch });
  const updateAddress = patch => update({ address: { ...form.address, ...patch } });
  const selectedDetails = selected && <article className={styles.details}>
    <p className={styles.municipality}><strong>{selected.address.city}</strong>{selected.address.state ? ` · ${selected.address.state}` : ''}</p><h3>{selected.name}</h3><p><strong>Quando:</strong> {actionScheduleSummary(selected)}</p><p><strong>Local:</strong> {selected.address.street}, {selected.address.number}{selected.address.neighborhood ? ` · ${selected.address.neighborhood}` : ''}</p>{selected.description && <p><strong>Sobre a ação:</strong> {selected.description}</p>}{selected.whatToBring && <p><strong>O que levar:</strong> {selected.whatToBring}</p>}{selected.tips && <p><strong>Orientações:</strong> {selected.tips}</p>}
    <ActionPhotoGallery action={selected} />
    <button className={styles.participate} type="button" disabled={loading} onClick={beginParticipation}>{loading ? 'Concluindo…' : 'Quero participar'}</button>
  </article>;
  return <section className={styles.panel} aria-live="polite">
    {!actionId && <section className={styles.actionChooser} aria-label="Lista de ações">
        <h3>Ações disponíveis</h3>
        {loading ? <p>Carregando ações…</p> : actions.length === 0 ? <p>Não há ações abertas neste estado.</p> : <div className={styles.actions}>{actions.map(action => <button className={styles.actionChoice} type="button" key={action.id} onClick={() => openDetails(action)}><span className={styles.municipality}><strong>{action.address.city}</strong>{action.address.state ? ` · ${action.address.state}` : ''}</span><strong>{action.name}</strong><span>{action.address.street}, {action.address.number}</span><small>{actionScheduleSummary(action)}</small><b>Ver detalhes <span aria-hidden="true">→</span></b></button>)}</div>}
      </section>}
    {actionId && selectedDetails}
    {selected && !actionId && !showSignup && createPortal(<div className={styles.modalBackdrop} role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) closeDetails(); }}><section className={styles.actionModal} role="dialog" aria-modal="true" aria-labelledby="action-details-title" onMouseDown={event => event.stopPropagation()}><header><div><p className={styles.municipality}>Detalhes da ação</p><h2 id="action-details-title">Informações da ação</h2></div><button className={styles.close} type="button" aria-label="Fechar detalhes da ação" onClick={closeDetails}>×</button></header>{selectedDetails}</section></div>, document.body)}
    {selected && showSignup && !user && createPortal(<div className={styles.modalBackdrop} role="presentation"><section className={styles.signup} role="dialog" aria-modal="true" aria-labelledby="participation-title">
      <div className={styles.modalHeader}><div><p className={styles.municipality}><strong>{selected.address.city}</strong>{selected.address.state ? ` · ${selected.address.state}` : ''}</p><h3 id="participation-title">Participar: {selected.name}</h3></div><button className={styles.close} type="button" aria-label="Fechar formulário" onClick={() => { setShowSignup(false); setError(''); }}>×</button></div><div className={styles.tabs}><button type="button" onClick={() => setMode('signup')}>Nova inscrição</button><button type="button" onClick={() => setMode('login')}>Já tenho acesso</button></div><form onSubmit={submit}>
        {mode === 'signup' && <>
          <label>Nome completo<input required value={form.fullName} onChange={e => update({ fullName: e.target.value })} /></label><label>Telefone<input required value={form.phone} onChange={e => update({ phone: formatPhone(e.target.value) })} /></label><label>CPF<input required inputMode="numeric" value={form.cpf} onChange={e => update({ cpf: e.target.value })} /></label><label>RG<input required value={form.rg} onChange={e => update({ rg: e.target.value })} /></label><label>Data de nascimento<input required type="date" value={form.birthDate} onChange={e => update({ birthDate: e.target.value })} /></label>
          <fieldset className={styles.address}><legend>Endereço <small>(somente cidade e estado são obrigatórios)</small></legend><label>CEP<input inputMode="numeric" value={formatCep(form.address.cep)} onChange={e => updateAddress({ cep: formatCep(e.target.value) })} /></label><label>Logradouro<input value={form.address.street} onChange={e => updateAddress({ street: e.target.value })} /></label><label>Número<input value={form.address.number} onChange={e => updateAddress({ number: e.target.value })} /></label><label>Complemento <small>(opcional)</small><input value={form.address.complement} onChange={e => updateAddress({ complement: e.target.value })} /></label><label>Bairro<input value={form.address.neighborhood} onChange={e => updateAddress({ neighborhood: e.target.value })} /></label><label>Cidade<input required value={form.address.city} onChange={e => updateAddress({ city: e.target.value })} /></label><label>Estado<select required value={form.address.state} onChange={e => updateAddress({ state: e.target.value })}><option value="">Selecione</option>{BRAZIL_STATES.map(item => <option key={item.code} value={item.code}>{item.code} — {item.name}</option>)}</select></label></fieldset>
          <label>Tamanho da camiseta<select required value={form.shirtSize} onChange={e => update({ shirtSize: e.target.value })}><option value="">Selecione</option>{SHIRT_SIZES.map(size => <option key={size} value={size}>{size}</option>)}</select></label><label>Vínculo com a ONG<select required value={form.ngoRelationship} onChange={e => update({ ngoRelationship: e.target.value })}><option value="">Selecione…</option>{NGO_RELATIONSHIPS.map(item => <option key={item} value={item}>{item}</option>)}</select></label>
          <label className={styles.acceptance}><input required type="checkbox" checked={form.lgpdAccepted} onChange={e => update({ lgpdAccepted: e.target.checked })} />Concordo com o uso dos meus dados conforme LGPD.</label><div className={styles.regulationAcceptance}><label className={styles.acceptance}><input required type="checkbox" checked={form.regulationAccepted} onChange={e => update({ regulationAccepted: e.target.checked })} />Concordo com o Regulamento do Voluntário.</label><button type="button" className={styles.regulationButton} onClick={() => setShowRegulation(true)}>Ver regulamento</button></div><label className={styles.acceptance}><input required type="checkbox" checked={form.imageUseAccepted} onChange={e => update({ imageUseAccepted: e.target.checked })} />Autorizo a divulgação da minha imagem nas fotos e materiais institucionais da ONG Moradia e Cidadania.</label>{isMinorBirthDate(form.birthDate) && <label className={styles.acceptance}><input required type="checkbox" checked={form.guardianAuthorizationAccepted} onChange={e => update({ guardianAuthorizationAccepted: e.target.checked })} />Declaro que tenho autorização do meu responsável legal para participar da ação e para a divulgação da minha imagem.</label>}
        </>}
        <label>E-mail<input required type="email" value={form.email} onChange={e => update({ email: e.target.value })} /></label>{mode === 'login' && <label>Senha<input required type="password" minLength="8" value={form.password ?? ''} onChange={e => update({ password: e.target.value })} /></label>}<button disabled={loading}>{loading ? 'Concluindo…' : mode === 'signup' ? 'Confirmar inscrição' : 'Entrar e participar'}</button>
      </form>{error && <p className={styles.error} role="alert">{error}</p>}<button className={styles.back} type="button" onClick={() => { setShowSignup(false); setError(''); }}>← Voltar aos detalhes</button>
    </section></div>, document.body)}
    {confirmation && createPortal(<div className={styles.modalBackdrop} role="presentation"><section className={styles.successModal} role="dialog" aria-modal="true" aria-labelledby="enrollment-success-title"><button className={styles.close} type="button" aria-label="Fechar confirmação" onClick={() => { setConfirmation(null); setSelected(null); }}>×</button><p className={styles.municipality}>INSCRIÇÃO EFETIVADA</p><h2 id="enrollment-success-title">Tudo certo!</h2><p>Sua participação em <strong>{confirmation.actionName}</strong> foi confirmada.</p>{confirmation.publicRegistration && <p>Seus dados e autorizações foram registrados. Não é necessário criar senha para esta inscrição.</p>}<div><button type="button" className={styles.secondaryAction} onClick={() => { setConfirmation(null); setSelected(null); }}>Continuar navegando</button>{!confirmation.publicRegistration && <button type="button" onClick={() => navigate('/voluntario')}>Ir para minha área</button>}</div></section></div>, document.body)}
    {!showSignup && error && <p className={styles.error}>{error}</p>}<VolunteerRegulation open={showRegulation} onClose={() => setShowRegulation(false)} />
  </section>;
}
