import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "../auth/useAuth";
import AttendancePage from './AttendancePage';
import { getBranch } from "../services/branchesService";
import { listCoordinationActionVolunteers } from "../services/volunteersService";
import { listActionsByBranch } from '../services/actionsService';
import { useInfiniteScroll } from "../shared/hooks/useInfiniteScroll";
import ListSearch from '../components/ListSearch';
import styles from "./ConsultationPage.module.css";

export default function ConsultationPage() {
  const { user, claims } = useAuth();
  const [actions, setActions] = useState([]);
  const [branch, setBranch] = useState(null);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    let current = true;
    setLoading(true); setSelected(null); setError('');
    Promise.all([getBranch(claims.branchId), listActionsByBranch(claims.branchId)])
      .then(([branch, actions]) => { if (current) { setBranch(branch); setActions(actions); } })
      .catch(() => { if (current) setError('Não foi possível carregar as ações da sua coordenação estadual.'); })
      .finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, [claims.branchId]);
  if (selected) return <ActionDetails key={selected.id} action={selected} branch={branch} user={user} onBack={() => setSelected(null)} />;
  return <main className={styles.page}>
    <header className={styles.header}><div><p>Minha coordenação estadual</p><h1>{branch?.name ?? 'Ações cadastradas'}</h1><span>Selecione uma ação para consultar os voluntários inscritos.</span></div></header>
    {error && <p role="alert" className={styles.error}>{error}</p>}
    {loading ? <p>Carregando ações…</p> : <section className={styles.list} aria-label="Ações cadastradas">
      {!error && actions.length === 0 && <p className={styles.empty}>Nenhuma ação cadastrada nesta coordenação estadual.</p>}
      {actions.map(action => <article className={styles.actions} key={action.id}><div><h2>{action.name}</h2><p>{action.date?.split('-').reverse().join('/')} · {action.address?.city}</p></div><button type="button" onClick={() => setSelected(action)}>Abrir ação</button></article>)}
    </section>}
  </main>;
}

function ActionDetails({ action, branch, user, onBack }) {
  const [view, setView] = useState('details');
  if (view === 'volunteers') return <ActionVolunteers action={action} branch={branch} user={user} onBack={() => setView('details')} />;
  if (view === 'attendance') return <><div className={styles.page}><button className={styles.back} type="button" onClick={() => setView('details')}>← Voltar aos detalhes da ação</button></div><AttendancePage fixedAction={action} /></>;
  const address = action.address ?? {};
  const statuses = { planning: 'Em planejamento', active: 'Ativa', closed: 'Encerrada' };
  return <main className={styles.page}>
    <button className={styles.back} type="button" onClick={onBack}>← Voltar às ações</button>
    <header className={styles.header}><div><p>{branch?.name}</p><h1>{action.name}</h1></div></header>
    <section className={styles.details} aria-labelledby="action-details-title">
      <h2 id="action-details-title">Dados da ação</h2><dl>
        <dt>Data</dt><dd>{action.date?.split('-').reverse().join('/') || 'Não informada'}</dd>
        <dt>Situação</dt><dd>{statuses[action.status] ?? action.status ?? 'Não informada'}</dd>
        <dt>Local</dt><dd>{[address.street, address.number, address.complement, address.neighborhood, address.city, address.state].filter(Boolean).join(', ')}</dd>
        {address.cep && <><dt>CEP</dt><dd>{address.cep}</dd></>}
        <dt>O que levar</dt><dd>{action.whatToBring || 'Não informado'}</dd>
        <dt>Orientações</dt><dd>{action.tips || 'Nenhuma orientação adicional.'}</dd>
      </dl></section>
    <nav className={styles.actions} aria-label="Participantes da ação">
      <button type="button" onClick={() => setView('volunteers')}>Voluntários inscritos e impressão</button>
      <button type="button" onClick={() => setView('attendance')}>Lista de presença</button>
    </nav>
  </main>;
}

function ActionVolunteers({ action, branch, user, onBack }) {
  const [search, setSearch] = useState("");
  const loading = false;
  const [error, setError] = useState("");
  const [preparingPrint, setPreparingPrint] = useState(false);
  const [printReady, setPrintReady] = useState(false);
  const preparingRef = useRef(false);
  const mountedRef = useRef(true);

  const buscarPagina = useCallback(({ filtros, cursor, pageSize }) => listCoordinationActionVolunteers({
    actionId: action.id, search: filtros.search, cursor, pageSize,
  }), [action.id]);
  const { dados: volunteers, loading: loadingVolunteers, error: listError, hasMore, recarregar, carregarMais } = useInfiniteScroll(buscarPagina, { pageSize: 10 });


  useEffect(() => { recarregar({ search }); }, [recarregar, search]);

  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; }; }, []);
  useEffect(() => {
    if (!printReady) return;
    setPrintReady(false);
    window.print();
  }, [printReady]);

  async function printAll() {
    if (preparingRef.current || loadingVolunteers) return;
    if (!window.confirm("Carregar os voluntários restantes desta ação, respeitando a busca atual, e imprimir?")) return;
    preparingRef.current = true; setPreparingPrint(true); setError("");
    try {
      let remaining = hasMore;
      while (remaining && mountedRef.current) {
        const result = await carregarMais();
        if (!result || result.error || result.skipped || result.ignored) throw new Error("Não foi possível carregar a lista completa. Tente novamente; os registros já carregados foram mantidos.");
        remaining = result.hasMore;
      }
      if (mountedRef.current) setPrintReady(true);
    } catch (err) { if (mountedRef.current) setError(err.message); }
    finally { preparingRef.current = false; if (mountedRef.current) setPreparingPrint(false); }
  }

  return (
    <main className={styles.page}>
      <button className={styles.back} type="button" disabled={preparingPrint} onClick={onBack}>← Voltar aos detalhes da ação</button>
      <header className={styles.header}>
        <div><p>{branch?.name}</p><h1>{action.name}</h1><span>{action.date?.split('-').reverse().join('/')} · Usuário: {user.displayName ?? user.email}</span></div>
        <span className={styles.readOnly}>Somente consulta</span>
      </header>

      <section className={styles.actions} aria-labelledby="list-title">
        <div><h2 id="list-title">Listagem de voluntários</h2><p>{volunteers.length} carregado{volunteers.length === 1 ? "" : "s"}</p></div>
        <ListSearch placeholder="Nome do voluntário" initialValue={search} disabled={preparingPrint} onSearch={value => { if (!preparingRef.current) setSearch(value); }} />
        <button type="button" disabled={loading || loadingVolunteers || preparingPrint || !!listError || volunteers.length === 0} onClick={() => window.print()}>Imprimir carregados ({volunteers.length})</button>
        <button type="button" disabled={loading || loadingVolunteers || preparingPrint || !!listError || volunteers.length === 0} onClick={printAll}>{preparingPrint ? "Carregando para impressão…" : "Carregar todos e imprimir"}</button>
      </section>

      <p className={styles.safety}>A lista e a impressão mostram somente os nomes dos voluntários desta ação.</p>
      <p role="status">{preparingPrint ? `Preparando lista: ${volunteers.length} voluntários carregados…` : `${volunteers.length} voluntários carregados. ${hasMore ? "Lista parcial: existem mais registros para carregar." : "Todos os resultados da busca foram carregados."}`}{search && ` Busca aplicada: ${search}.`}</p>
      {(error || listError) && <p className={styles.error} role="alert">{error || "Não foi possível carregar a listagem."}</p>}

      <section className={styles.list} aria-live="polite">
        {loading || (loadingVolunteers && volunteers.length === 0) ? <p aria-busy="true">Carregando...</p> : volunteers.length === 0 ? <p className={styles.empty}>Nenhum voluntário encontrado nesta coordenação estadual.</p> : volunteers.map((volunteer, index) => (
          <article className={styles.volunteer} key={volunteer.id}>
            <span className={styles.number}>{index + 1}</span>
            <div className={styles.name}><span>Nome</span><strong>{volunteer.fullName}</strong></div>
          </article>
        ))}
      </section>
      {volunteers.length > 0 && hasMore && <button className={styles.loadMore} type="button" disabled={loadingVolunteers || preparingPrint} onClick={carregarMais}>{loadingVolunteers ? "Carregando..." : "Carregar mais voluntários"}</button>}
    </main>
  );
}
