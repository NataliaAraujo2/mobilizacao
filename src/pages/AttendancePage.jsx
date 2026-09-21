import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../auth/useAuth';
import { listActionsByBranch } from '../services/actionsService';
import { getAttendanceSession, listAttendance, setVolunteerAttendance, startAttendanceSession } from '../services/attendanceService';
import { listBranches } from '../services/branchesService';
import { listCoordinationActionVolunteers } from '../services/volunteersService';
import ListSearch from '../components/ListSearch';
import styles from './AttendancePage.module.css';

function today() { return new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' }); }

export default function AttendancePage({ fixedAction = null }) {
  const { claims } = useAuth();
  const isSuperAdmin = claims?.role === 'superAdmin';
  const [branches, setBranches] = useState([]);
  const [branchId, setBranchId] = useState(fixedAction?.branchId ?? (isSuperAdmin ? '' : claims?.branchId ?? ''));
  const [actions, setActions] = useState(fixedAction ? [fixedAction] : []);
  const [actionId, setActionId] = useState(fixedAction?.id ?? '');
  const [volunteers, setVolunteers] = useState([]);
  const [presentIds, setPresentIds] = useState(new Set());
  const [sessionStarted, setSessionStarted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState('');
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  const loadActionVolunteers = useCallback(async () => {
    let cursor = null; let hasMore = true; const rows = [];
    while (hasMore) {
      const result = await listCoordinationActionVolunteers({ actionId, cursor, pageSize: 100 });
      rows.push(...result.data);
      cursor = result.cursor; hasMore = result.hasMore;
    }
    return rows;
  }, [actionId]);

  useEffect(() => {
    if (!isSuperAdmin || fixedAction) return;
    listBranches().then(items => setBranches(items.filter(item => item.status === 'active'))).catch(() => setError('Não foi possível carregar as coordenações estaduais.'));
  }, [isSuperAdmin, fixedAction]);

  useEffect(() => {
    if (fixedAction) return;
    setActionId(''); setVolunteers([]); setPresentIds(new Set()); setSessionStarted(false);
    if (!branchId) { setActions([]); return; }
    listActionsByBranch(branchId).then(setActions).catch(() => setError('Não foi possível carregar as ações.'));
  }, [branchId, fixedAction]);

  useEffect(() => {
    if (!actionId) { setVolunteers([]); setPresentIds(new Set()); setSessionStarted(false); return; }
    let current = true; setLoading(true); setError('');
    Promise.all([loadActionVolunteers(), listAttendance(actionId, branchId), getAttendanceSession(actionId)])
      .then(([items, attendance, session]) => { if (current) { setVolunteers(items); setPresentIds(attendance); setSessionStarted(Boolean(session)); } })
      .catch(() => { if (current) setError('Não foi possível carregar a lista de presença.'); })
      .finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, [actionId, branchId, loadActionVolunteers]);

  async function toggle(volunteerId, present) {
    setSavingId(volunteerId); setError('');
    try {
      if (!sessionStarted) { await startAttendanceSession(actionId, branchId); setSessionStarted(true); }
      await setVolunteerAttendance({ actionId, branchId, volunteerId, present });
      setPresentIds(current => { const next = new Set(current); if (present) next.add(volunteerId); else next.delete(volunteerId); return next; });
    } catch { setError('Não foi possível registrar a presença.'); }
    finally { setSavingId(''); }
  }

  const selectedAction = actions.find(item => item.id === actionId);
  const attendanceEffective = sessionStarted || Boolean(selectedAction?.date && selectedAction.date < today());
  const canEditAttendance = isSuperAdmin || selectedAction?.date === today();
  const filteredVolunteers = volunteers.filter((volunteer) => volunteer.fullName.toLocaleLowerCase('pt-BR').includes(search.toLocaleLowerCase('pt-BR')));
  return <main className={styles.page}>
    <header><p>{isSuperAdmin ? 'Administração nacional' : 'Minha coordenação estadual'}</p><h1>Lista de presença</h1><span>{fixedAction ? fixedAction.name : 'Selecione uma ação para imprimir os nomes e registrar as presenças.'}</span></header>
    <section className={styles.filters}>
      {isSuperAdmin && !fixedAction && <label>Coordenação estadual<select value={branchId} onChange={event => setBranchId(event.target.value)}><option value="">Selecione</option>{branches.map(branch => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select></label>}
      {!fixedAction && <label>Ação<select disabled={!branchId} value={actionId} onChange={event => setActionId(event.target.value)}><option value="">Selecione</option>{actions.map(action => <option key={action.id} value={action.id}>{action.name}</option>)}</select></label>}
      {actionId && <button disabled={loading || Boolean(error) || volunteers.length === 0} type="button" onClick={() => window.print()}>Imprimir lista de nomes</button>}
    </section>
    {error && <p className={styles.error} role="alert">{error}</p>}
    {actionId && <section className={styles.sheet} aria-busy={loading}>
      <header><div><h2>{selectedAction?.name}</h2><p>{selectedAction?.address?.street}, {selectedAction?.address?.number} · {selectedAction?.address?.city}/{selectedAction?.address?.state}</p></div><p>{volunteers.length} voluntário(s){attendanceEffective ? ` · ${presentIds.size} presente(s) · ${volunteers.length - presentIds.size} ausente(s)` : ' · chamada não iniciada'}</p></header>
      <div className={styles.search}><ListSearch label="Buscar voluntário" placeholder="Nome do voluntário" initialValue="" onSearch={setSearch} disabled={loading} /></div>
      {!attendanceEffective && volunteers.length > 0 && <p className={styles.callNotice}>A chamada ainda não começou. Ao marcar a primeira presença, os demais passarão a constar como ausentes.</p>}
      {!isSuperAdmin && selectedAction?.date !== today() && <p className={styles.callNotice}>{selectedAction?.date < today() ? 'A chamada foi encerrada. Somente o superadmin pode fazer correções.' : 'A presença poderá ser registrada no dia da ação.'}</p>}
      {loading ? <p>Carregando…</p> : volunteers.length === 0 ? <p>Nenhum voluntário vinculado a esta ação.</p> : filteredVolunteers.length === 0 ? <p>Nenhum voluntário encontrado para a busca.</p> : <ol>{filteredVolunteers.map(volunteer => <li key={volunteer.id}><label><input type="checkbox" checked={presentIds.has(volunteer.id)} disabled={!canEditAttendance || savingId === volunteer.id} onChange={event => toggle(volunteer.id, event.target.checked)} /><strong>{volunteer.fullName}</strong><span>{!attendanceEffective ? 'Participante' : presentIds.has(volunteer.id) ? 'Presente' : 'Ausente'}</span></label></li>)}</ol>}
    </section>}
  </main>;
}
