import { useEffect, useState } from 'react';
import { useAuth } from '../auth/useAuth';
import { getActionsByIds } from '../services/actionsService';
import { getAttendanceSession, listMyAttendance } from '../services/attendanceService';
import { getVolunteer } from '../services/volunteersService';
import { withdrawFromAction } from '../services/publicVolunteerService';
import styles from './VolunteerAreaPage.module.css';

function today() { return new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' }); }

export default function VolunteerAreaPage() {
  const { user } = useAuth();
  const [volunteer, setVolunteer] = useState(null);
  const [actions, setActions] = useState([]);
  const [statuses, setStatuses] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState('');

  async function withdraw(action) {
    if (!window.confirm(`Cancelar sua participação em “${action.name}”?`)) return;
    setBusyId(action.id); setError('');
    try { await withdrawFromAction(action.id); setActions(current => current.filter(item => item.id !== action.id)); }
    catch (err) { setError(err.message || 'Não foi possível cancelar a participação.'); }
    finally { setBusyId(''); }
  }

  useEffect(() => {
    let current = true;
    getVolunteer(user.uid).then(async profile => {
      const items = await getActionsByIds(profile.actionIds ?? []);
      const attendance = await Promise.all(items.map(async action => {
        const [session, presence] = await Promise.all([getAttendanceSession(action.id), listMyAttendance(action.id, user.uid)]);
        const status = action.date < today() || session ? (presence ? 'Presente' : 'Ausente') : 'Participante';
        return [action.id, status];
      }));
      if (current) { setVolunteer(profile); setActions(items); setStatuses(Object.fromEntries(attendance)); }
    }).catch(() => { if (current) setError('Não foi possível carregar suas ações.'); }).finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, [user.uid]);

  return <main className={styles.page}><header><p>Área do voluntário</p><h1>Minhas ações</h1><span>{volunteer?.fullName ?? user.displayName}</span></header>{error && <p className={styles.error}>{error}</p>}{loading ? <p>Carregando…</p> : actions.length === 0 ? <p>Você ainda não está inscrito em nenhuma ação.</p> : <section className={styles.list}>{actions.map(action => <article key={action.id}><div><h2>{action.name}</h2><strong className={styles[statuses[action.id]?.toLowerCase()]}>{statuses[action.id]}</strong></div><p>{action.date.split('-').reverse().join('/')} · {action.address.city}/{action.address.state}</p><p>{action.address.street}, {action.address.number}</p>{action.whatToBring && <p><strong>O que levar:</strong> {action.whatToBring}</p>}{action.tips && <p><strong>Orientações:</strong> {action.tips}</p>}{statuses[action.id] === 'Participante' && action.date > today() && <button type="button" disabled={busyId === action.id} onClick={() => withdraw(action)}>{busyId === action.id ? 'Cancelando…' : 'Cancelar participação'}</button>}</article>)}</section>}</main>;
}
