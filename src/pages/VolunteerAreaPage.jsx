import { useEffect, useState } from 'react';
import { useAuth } from '../auth/useAuth';
import { getVolunteerDashboard, withdrawFromAction } from '../services/publicVolunteerService';
import ActionPhotoGallery from '../components/ActionPhotoGallery';
import { actionScheduleSummary } from '../domain/actions/actionSchedule';
import { formatPhone } from '../../functions/contactFields.js';
import styles from './VolunteerAreaPage.module.css';

function today() { return new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' }); }
function paragraphs(value) { return String(value ?? '').split(/\n\s*\n/).map(item => item.trim()).filter(Boolean); }
function formatBirthDate(value) { const [year, month, day] = String(value ?? '').split('-'); return year && month && day ? `${day}/${month}/${year}` : 'Não informado'; }

export default function VolunteerAreaPage() {
  const { user } = useAuth();
  const [volunteer, setVolunteer] = useState(null);
  const [actions, setActions] = useState([]);
  const [statuses, setStatuses] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState('');
  const [tab, setTab] = useState('actions');

  async function withdraw(action) {
    if (!window.confirm(`Cancelar sua participação em “${action.name}”?`)) return;
    setBusyId(action.id); setError('');
    try { await withdrawFromAction(action.id); setActions(current => current.filter(item => item.id !== action.id)); }
    catch (err) { setError(err.message || 'Não foi possível cancelar a participação.'); }
    finally { setBusyId(''); }
  }

  useEffect(() => {
    let current = true;
    getVolunteerDashboard().then(({ volunteer: profile, actions: items, sessionActionIds, presentActionIds }) => {
      const sessions = new Set(sessionActionIds);
      const presents = new Set(presentActionIds);
      const attendance = items.map(action => [action.id, action.date < today() || sessions.has(action.id) ? (presents.has(action.id) ? 'Presente' : 'Ausente') : 'Participante']);
      if (current) { setVolunteer(profile); setActions(items); setStatuses(Object.fromEntries(attendance)); }
    }).catch(() => { if (current) setError('Não foi possível carregar suas ações.'); }).finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, [user.uid]);

  return <main className={styles.page}><header><p>Área do voluntário</p><h1>Minha MobilizAÇÃO</h1><span>{volunteer?.fullName ?? user.displayName}</span></header>{error && <p className={styles.error}>{error}</p>}{loading ? <p>Carregando…</p> : <><nav className={styles.tabs} aria-label="Área do voluntário"><button type="button" className={tab === 'actions' ? styles.tabActive : ''} onClick={() => setTab('actions')}>Ações inscritas <span>{actions.length}</span></button><button type="button" className={tab === 'profile' ? styles.tabActive : ''} onClick={() => setTab('profile')}>Dados pessoais</button></nav>{tab === 'profile' ? <section className={styles.profile}><h2>Dados pessoais</h2><p>Confira os dados informados no seu cadastro.</p><dl><div><dt>Nome completo</dt><dd>{volunteer.fullName}</dd></div><div><dt>E-mail</dt><dd>{volunteer.email || 'Não informado'}</dd></div><div><dt>Telefone</dt><dd>{formatPhone(volunteer.phone) || 'Não informado'}</dd></div><div><dt>Data de nascimento</dt><dd>{formatBirthDate(volunteer.birthDate)}</dd></div><div><dt>Tamanho da camiseta</dt><dd>{volunteer.shirtSize || 'Não informado'}</dd></div><div><dt>Vínculo com a ONG</dt><dd>{volunteer.ngoRelationship || 'Não informado'}</dd></div><div className={styles.full}><dt>Endereço</dt><dd>{[volunteer.address?.street, volunteer.address?.number, volunteer.address?.complement, volunteer.address?.neighborhood, volunteer.address?.city, volunteer.address?.state].filter(Boolean).join(', ') || 'Não informado'}</dd></div></dl></section> : actions.length === 0 ? <section className={styles.empty}><h2>Ações inscritas</h2><p>Você ainda não está inscrito em nenhuma ação.</p></section> : <section className={styles.list}>{actions.map(action => <article key={action.id}><header className={styles.actionHeader}><h2>{action.name}</h2><strong className={styles[statuses[action.id]?.toLowerCase()]}>{statuses[action.id]}</strong></header><dl className={styles.essentials}><div><dt>Quando</dt><dd>{actionScheduleSummary(action)}</dd></div><div><dt>Onde</dt><dd>{action.address.street}, {action.address.number} · {action.address.city}/{action.address.state}</dd></div></dl>{(action.description || action.whatToBring || action.tips || action.photosBefore?.length || action.photosDuring?.length || action.photosAfter?.length) && <details className={styles.actionDetails}><summary>Ver detalhes da ação</summary>{action.description && <section className={styles.detail}><h3>Sobre a ação</h3>{paragraphs(action.description).map((text, index) => <p key={index}>{text}</p>)}</section>}{action.whatToBring && <section className={styles.detail}><h3>O que levar</h3>{paragraphs(action.whatToBring).map((text, index) => <p key={index}>{text}</p>)}</section>}{action.tips && <section className={styles.detail}><h3>Orientações</h3>{paragraphs(action.tips).map((text, index) => <p key={index}>{text}</p>)}</section>}<ActionPhotoGallery action={action} /></details>}{statuses[action.id] === 'Participante' && action.date > today() && <button type="button" disabled={busyId === action.id} onClick={() => withdraw(action)}>{busyId === action.id ? 'Cancelando…' : 'Cancelar participação'}</button>}</article>)}</section>}</>}</main>;
}
