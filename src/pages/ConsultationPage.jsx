import { useCallback, useEffect, useRef, useState } from "react";
import * as XLSX from "xlsx";
import QRCode from "qrcode";
import { useAuth } from "../auth/useAuth";
import AttendancePage from './AttendancePage';
import { getBranch } from "../services/branchesService";
import { listCoordinationActionVolunteers } from "../services/volunteersService";
import { listActionsByBranch } from '../services/actionsService';
import { useInfiniteScroll } from "../shared/hooks/useInfiniteScroll";
import ListSearch from '../components/ListSearch';
import ActionPhotoGallery from '../components/ActionPhotoGallery';
import { actionScheduleSummary, formatActionDate } from '../domain/actions/actionSchedule';
import ActionStatus from '../components/ActionStatus';
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
  if (selected) return <CoordinationActionDetails key={selected.id} action={selected} branch={branch} user={user} onBack={() => setSelected(null)} />;
  return <main className={styles.page}>
    <header className={styles.header}><div><p>Minha coordenação estadual</p><h1>{branch?.name ?? 'Ações cadastradas'}</h1><span>Selecione uma ação para consultar os voluntários inscritos.</span></div></header>
    {error && <p role="alert" className={styles.error}>{error}</p>}
    {loading ? <p>Carregando ações…</p> : <section className={styles.list} aria-label="Ações cadastradas">
      {!error && actions.length === 0 && <p className={styles.empty}>Nenhuma ação cadastrada nesta coordenação estadual.</p>}
      {actions.map(action => <article className={styles.actions} key={action.id}><div><h2>{action.name}</h2><p>{actionScheduleSummary(action)} · {action.address?.city}</p></div><button type="button" onClick={() => setSelected(action)}>Abrir ação</button></article>)}
    </section>}
  </main>;
}

export function CoordinationActionDetails({ action, branch, user, onBack }) {
  const [view, setView] = useState('details');
  if (view === 'volunteers') return <ActionVolunteers action={action} branch={branch} user={user} onBack={() => setView('details')} />;
  if (view === 'attendance') return <><div className={styles.page}><button className={styles.back} type="button" onClick={() => setView('details')}>← Voltar aos detalhes da ação</button></div><AttendancePage fixedAction={action} /></>;
  const address = action.address ?? {};
  return <main className={styles.page}>
    <button className={styles.back} type="button" onClick={onBack}>← Voltar às ações</button>
    <header className={styles.header}><div><p>{branch?.name}</p><h1>{action.name}</h1></div></header>
    <section className={styles.details} aria-labelledby="action-details-title">
      <div className={styles.detailsHeading}><p>Informações do evento</p><h2 id="action-details-title">Dados da ação</h2></div><dl>
        <div><dt>Data de início</dt><dd>{formatActionDate(action.startDate ?? action.date)}</dd></div>
        <div><dt>Hora de início</dt><dd>{action.startTime || 'Não informada'}</dd></div>
        <div><dt>Data de fim</dt><dd>{formatActionDate(action.endDate ?? action.startDate ?? action.date)}</dd></div>
        <div><dt>Hora de fim</dt><dd>{action.endTime || 'Não informada'}</dd></div>
        {action.scheduleText && <div className={styles.detailWide}><dt>Informações de data e horário</dt><dd>{action.scheduleText}</dd></div>}
        <div><dt>Situação</dt><dd><ActionStatus action={action} /></dd></div>
        <div className={styles.detailWide}><dt>Local</dt><dd>{[address.street, address.number, address.complement, address.neighborhood, address.city, address.state].filter(Boolean).join(', ')}</dd></div>
        {address.cep && <div><dt>CEP</dt><dd>{address.cep}</dd></div>}
        {action.description && <div className={styles.detailWide}><dt>Descrição</dt><dd>{action.description}</dd></div>}
        <div className={styles.detailWide}><dt>O que levar</dt><dd>{action.whatToBring || 'Não informado'}</dd></div>
        <div className={styles.detailWide}><dt>Orientações</dt><dd>{action.tips || 'Nenhuma orientação adicional.'}</dd></div>
      </dl><ActionPhotoGallery action={action} /></section>
    <ActionQrCodes action={action} />
    <nav className={`${styles.actions} ${styles.detailActions}`} aria-label="Participantes da ação">
      <button type="button" onClick={() => setView('volunteers')}>Voluntários inscritos e impressão</button>
      <button type="button" onClick={() => setView('attendance')}>Lista de presença</button>
    </nav>
  </main>;
}

function ActionQrCodes({ action }) {
  const [codes, setCodes] = useState({ registration: "", attendance: "" });
  const [error, setError] = useState("");
  const urls = {
    registration: `${window.location.origin}/participar/${action.id}`,
    attendance: `${window.location.origin}/presenca/${action.id}`,
  };

  useEffect(() => {
    let active = true;
    Promise.all([
      QRCode.toDataURL(urls.registration, { width: 240, margin: 2, errorCorrectionLevel: "M" }),
      QRCode.toDataURL(urls.attendance, { width: 240, margin: 2, errorCorrectionLevel: "M" }),
    ]).then(([registration, attendance]) => {
      if (active) setCodes({ registration, attendance });
    }).catch(() => {
      if (active) setError("Não foi possível gerar os QR Codes.");
    });
    return () => { active = false; };
  }, [urls.attendance, urls.registration]);

  function download(kind) {
    const link = document.createElement("a");
    link.href = codes[kind];
    link.download = `qr-${kind === "attendance" ? "presenca" : "inscricao"}-${action.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.png`;
    link.click();
  }

  return <section className={styles.qrSection} aria-labelledby="action-qrs-title">
    <div className={styles.qrHeading}><div><p>Divulgação e controle no local</p><h2 id="action-qrs-title">QR Codes da ação</h2></div><span>Use o código certo para cada momento.</span></div>
    {error && <p role="alert" className={styles.error}>{error}</p>}
    <div className={styles.qrGrid}>
      <article className={styles.qrCard}><div><p>Inscrição</p><h3>Novos voluntários</h3><span>Abre o cadastro/login para participar desta ação.</span></div>{codes.registration && <img src={codes.registration} alt={`QR Code de inscrição para ${action.name}`} />}<button type="button" onClick={() => download("registration")}>Baixar QR de inscrição</button></article>
      <article className={styles.qrCard}><div><p>Presença</p><h3>Confirmação no local</h3><span>Uso exclusivo de voluntários já inscritos, durante a ação.</span></div>{codes.attendance && <img src={codes.attendance} alt={`QR Code de presença para ${action.name}`} />}<button type="button" onClick={() => download("attendance")}>Baixar QR de presença</button></article>
    </div>
  </section>;
}

function ActionVolunteers({ action, branch, user, onBack }) {
  const [search, setSearch] = useState("");
  const loading = false;
  const [error, setError] = useState("");
  const [preparingPrint, setPreparingPrint] = useState(false);
  const preparingRef = useRef(false);
  const mountedRef = useRef(true);
  const volunteersRef = useRef([]);

  const buscarPagina = useCallback(({ filtros, cursor, pageSize }) => listCoordinationActionVolunteers({
    actionId: action.id, search: filtros.search, cursor, pageSize,
  }), [action.id]);
  const { dados: volunteers, loading: loadingVolunteers, error: listError, hasMore, recarregar, carregarMais } = useInfiniteScroll(buscarPagina, { pageSize: 10 });


  useEffect(() => { recarregar({ search }); }, [recarregar, search]);
  useEffect(() => { volunteersRef.current = volunteers; }, [volunteers]);

  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; }; }, []);
  async function exportAll() {
    if (preparingRef.current || loadingVolunteers) return;
    if (!window.confirm("Carregar todos os voluntários desta ação, respeitando a busca atual, e baixar uma planilha Excel?")) return;
    preparingRef.current = true; setPreparingPrint(true); setError("");
    try {
      let remaining = hasMore;
      while (remaining && mountedRef.current) {
        const result = await carregarMais();
        if (!result || result.error || result.skipped || result.ignored) throw new Error("Não foi possível carregar a lista completa. Tente novamente; os registros já carregados foram mantidos.");
        remaining = result.hasMore;
      }
      if (mountedRef.current) {
        const rows = volunteersRef.current.map((volunteer, index) => ({
          "Nº": index + 1,
          Nome: volunteer.fullName,
        }));
        const workbook = XLSX.utils.book_new();
        const worksheet = XLSX.utils.json_to_sheet(rows);
        worksheet["!cols"] = [{ wch: 8 }, { wch: 42 }];
        XLSX.utils.book_append_sheet(workbook, worksheet, "Voluntários");
        const fileName = `voluntarios-${action.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.xlsx`;
        XLSX.writeFile(workbook, fileName);
      }
    } catch (err) { if (mountedRef.current) setError(err.message); }
    finally { preparingRef.current = false; if (mountedRef.current) setPreparingPrint(false); }
  }

  return (
    <main className={styles.page}>
      <button className={styles.back} type="button" disabled={preparingPrint} onClick={onBack}>← Voltar aos detalhes da ação</button>
      <header className={styles.header}>
        <div><p>{branch?.name}</p><h1>{action.name}</h1><span>{actionScheduleSummary(action)} · Usuário: {user.displayName ?? user.email}</span></div>
        <span className={styles.readOnly}>Somente consulta</span>
      </header>

      <section className={styles.actions} aria-labelledby="list-title">
        <div><h2 id="list-title">Listagem de voluntários</h2><p>{volunteers.length} carregado{volunteers.length === 1 ? "" : "s"}</p></div>
        <ListSearch placeholder="Nome do voluntário" initialValue={search} disabled={preparingPrint} onSearch={value => { if (!preparingRef.current) setSearch(value); }} />
        <button type="button" disabled={loading || loadingVolunteers || preparingPrint || !!listError || volunteers.length === 0} onClick={exportAll}>{preparingPrint ? "Carregando lista…" : "Carregar todos e baixar planilha"}</button>
      </section>

      <p className={styles.safety}>A planilha contém somente os nomes dos voluntários desta ação.</p>
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
