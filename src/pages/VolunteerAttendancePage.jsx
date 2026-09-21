import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';
import { confirmVolunteerAttendance, getVolunteerDashboard } from '../services/publicVolunteerService';
import { actionScheduleSummary } from '../domain/actions/actionSchedule';
import styles from './VolunteerAttendancePage.module.css';

export default function VolunteerAttendancePage() {
  const { actionId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [action, setAction] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    let active = true;
    getVolunteerDashboard().then(({ actions, presentActionIds }) => {
      const item = actions.find(current => current.id === actionId);
      if (!item) throw new Error('Esta ação não está vinculada à sua conta de voluntário.');
      if (active) { setAction(item); setConfirmed(presentActionIds.includes(actionId)); }
    }).catch(err => { if (active) setError(err.message || 'Não foi possível validar sua presença.'); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [actionId, user.uid]);

  async function confirm() {
    setBusy(true); setError('');
    try { await confirmVolunteerAttendance(actionId); setConfirmed(true); }
    catch (err) { setError(err.message || 'Não foi possível confirmar sua presença.'); }
    finally { setBusy(false); }
  }

  return <main className={styles.page}><section className={styles.card}>{loading ? <p>Validando sua inscrição…</p> : error && !action ? <><h1>Presença não confirmada</h1><p className={styles.error}>{error}</p><button type="button" onClick={() => navigate('/voluntario')}>Ir para minha área</button></> : <><p className={styles.eyebrow}>Confirmação no local</p><h1>{confirmed ? 'Presença confirmada!' : 'Confirmar presença'}</h1><p>{confirmed ? 'Sua presença já foi registrada nesta ação.' : 'Você está no local da ação? Confirme abaixo para registrar sua presença.'}</p><article><h2>{action.name}</h2><p>{actionScheduleSummary(action)}</p><p>{action.address.street}, {action.address.number} · {action.address.city}/{action.address.state}</p></article>{!confirmed && <button type="button" disabled={busy} onClick={confirm}>{busy ? 'Confirmando…' : 'Confirmar minha presença'}</button>}{error && <p className={styles.error} role="alert">{error}</p>}<button className={styles.secondary} type="button" onClick={() => navigate('/voluntario')}>Voltar para minha área</button></>}</section></main>;
}
