import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import FormFields from '../components/LinkForms/FormFields';
import { initialAnswers } from '../domain/forms/editorModel';
import { publicForms } from '../services/linkFormsService';
import { validateAnswers } from '../../functions/formDomain';
import styles from '../components/LinkForms/LinkForms.module.css';

export default function PublicLinkFormPage() {
  const { token } = useParams();
  const [activeToken, setActiveToken] = useState(token);
  const [form, setForm] = useState(null);
  const [answers, setAnswers] = useState({});
  const [branchId, setBranchId] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  useEffect(() => { setActiveToken(token); setName(''); setBranchId(''); }, [token]);
  useEffect(() => {
    const robots = document.createElement('meta'); robots.name = 'robots'; robots.content = 'noindex, nofollow, noarchive'; document.head.appendChild(robots);
    const referrer = document.createElement('meta'); referrer.name = 'referrer'; referrer.content = 'no-referrer'; document.head.appendChild(referrer);
    return () => { robots.remove(); referrer.remove(); };
  }, []);
  useEffect(() => {
    let current = true;
    setForm(null); setError(''); setSent(false);
    publicForms('open', { token: activeToken }).then(data => { if (current) { setForm(data); if (data.definition) setAnswers(initialAnswers(data.definition)); } }).catch(e => { if (current) setError(e.message); });
    return () => { current = false; };
  }, [activeToken]);
  async function submit(e) {
    e.preventDefault(); if (busy) return; setBusy(true); setError('');
    try { const valid = validateAnswers(form.definition, answers); await publicForms('submit', { token: activeToken, answers: valid }); setSent(true); }
    catch (err) { setError(err.message); } finally { setBusy(false); }
  }
  async function join(e) {
    e.preventDefault(); setBusy(true); setError('');
    try {
      const key = `form-session-${token}`;
      let session = window.localStorage.getItem(key);
      if (!session) { session = Array.from(crypto.getRandomValues(new Uint8Array(32)), b => b.toString(16).padStart(2, '0')).join(''); window.localStorage.setItem(key, session); }
      const result = await publicForms('join', { token, name, session, ...(form.collectBranch ? { branchId } : {}) }); setActiveToken(result.token);
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  }
  return <main className={styles.publicPage}>
    <p>Formulários · MobilizAÇÃO</p>
    {error && <p className={styles.error} role="alert">{error}</p>}
    {sent ? <section className={styles.card} role="status"><h1>Resposta enviada!</h1><p>Obrigado por participar. Sua resposta foi registrada e será revisada.</p></section>
      : !form ? !error && <p role="status">Carregando formulário…</p>
        : form.kind === 'general' ? <form className={styles.card} onSubmit={join}><h1>{form.title}</h1><p>{form.description}</p><p>Identifique-se para começar. Neste navegador, o mesmo link retoma sua solicitação.</p><label>Seu nome<input required maxLength={120} value={name} onChange={e => setName(e.target.value)} autoComplete="name" /></label>{form.collectBranch && <label>Sua regional<select required value={branchId} onChange={e => setBranchId(e.target.value)}><option value="">Selecione sua regional</option>{form.branches.map(branch => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select></label>}<button className={styles.primary} disabled={busy}>{busy ? 'Abrindo…' : 'Responder formulário'}</button></form>
          : <form onSubmit={submit}><p className={styles.notice}>Destinatário: {form.name}<br />Disponível até {new Date(form.expiresAt).toLocaleString('pt-BR')}</p><fieldset disabled={busy} className={styles.choices}><FormFields definition={form.definition} answers={answers} onChange={setAnswers} /><button className={styles.primary} disabled={busy}>{busy ? 'Enviando…' : 'Enviar resposta'}</button></fieldset></form>}
  </main>;
}
