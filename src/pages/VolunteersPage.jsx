import { formatPhone } from '../../functions/contactFields.js';
import ContactInput from '../components/ContactInput';
import PageHeading from '../components/PageHeading';
import VolunteerRegulation from '../components/VolunteerRegulation';
import { useCallback, useEffect, useState } from "react";
import { createPortal } from 'react-dom';
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import { createVolunteerRecords, isMinorBirthDate, maskCpf, NGO_RELATIONSHIPS, SHIRT_SIZES } from "../domain/volunteers/volunteerModel";
import { BRAZIL_STATES } from '../domain/locations/brazilStates';
import { getActionsByIds, listActionsByBranch } from '../services/actionsService';
import { findAddressByCep } from '../services/cepService';
import { actionScheduleSummary } from '../domain/actions/actionSchedule';
import { getBranch, listBranches } from "../services/branchesService";
import { createVolunteer, createVolunteerAccess, deleteVolunteer, getVolunteerPrivate, listVolunteerReport, listVolunteersPage, resetVolunteerPassword, updateVolunteer, updateVolunteerStatus } from "../services/volunteersService";
import { useInfiniteScroll } from "../shared/hooks/useInfiniteScroll";
import styles from "./VolunteersPage.module.css";

const EMPTY_ADDRESS = { cep: '', street: '', number: '', complement: '', neighborhood: '', city: '', state: '' };
const EMPTY_FORM = { fullName: "", email: "", phone: "", cpf: "", rg: "", birthDate: "", address: EMPTY_ADDRESS, shirtSize: '', ngoRelationship: '', lgpdAccepted: false, regulationAccepted: false, imageUseAccepted: false, guardianAuthorizationAccepted: false, actionIds: [], status: "active", accessStatus: "none" };

function formatCpf(value) {
  return value.replace(/\D/g, "").slice(0, 11).replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}
function formatCep(value) { return String(value ?? '').replace(/\D/g, '').slice(0, 8).replace(/(\d{5})(\d)/, '$1-$2'); }



export default function VolunteersPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { claims } = useAuth();
  const isSuperAdmin = claims?.role === "superAdmin";
  const ownBranchId = claims?.branchId ?? "";
  const listBranchId = isSuperAdmin ? null : ownBranchId;
  const [branches, setBranches] = useState([]);
  const [actions, setActions] = useState([]);
  const [reportActions, setReportActions] = useState([]);
  const [actionCatalog, setActionCatalog] = useState({});
  const [actionBranchId, setActionBranchId] = useState(ownBranchId);
  const [loadingActions, setLoadingActions] = useState(false);
  const [privateData, setPrivateData] = useState({});
  const [expandedId, setExpandedId] = useState("");
  const [showFullCpf, setShowFullCpf] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [credentials, setCredentials] = useState(null);
  const [reportFilter, setReportFilter] = useState({ branchId: 'all', actionId: 'all' });
  const [reportRows, setReportRows] = useState([]);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportReady, setReportReady] = useState(false);
  const [showRegulation, setShowRegulation] = useState(false);
  const [actionsVolunteer, setActionsVolunteer] = useState(null);
  const [modalActions, setModalActions] = useState([]);
  const [loadingModalActions, setLoadingModalActions] = useState(false);
  const [searchingCep, setSearchingCep] = useState(false);
  const [cepMessage, setCepMessage] = useState('');

  const buscarPagina = useCallback(({ filtros, cursor, pageSize }) => (
    listVolunteersPage({ branchId: filtros.branchId, cursor, pageSize })
  ), []);
  const {
    dados: volunteers,
    loading: loadingVolunteers,
    error: listError,
    hasMore,
    recarregar,
    carregarMais,
    atualizarDados,
  } = useInfiniteScroll(buscarPagina, { pageSize: 10 });

  useEffect(() => {
    if (!actionBranchId) { setActions([]); return; }
    let current = true; setLoadingActions(true);
    listActionsByBranch(actionBranchId).then(items => { if (current) { setActions(items); setActionCatalog(catalog => ({ ...catalog, ...Object.fromEntries(items.map(item => [item.id, item])) })); } }).catch(() => { if (current) setError('Não foi possível carregar as ações da coordenação estadual.'); }).finally(() => { if (current) setLoadingActions(false); });
    return () => { current = false; };
  }, [actionBranchId]);

  useEffect(() => {
    if (!reportFilter.branchId || reportFilter.branchId === 'all') { setReportActions([]); return; }
    let current = true;
    listActionsByBranch(reportFilter.branchId).then(items => { if (current) setReportActions(items); }).catch(() => { if (current) setError('Não foi possível carregar as ações do relatório.'); });
    return () => { current = false; };
  }, [reportFilter.branchId]);

  useEffect(() => {
    const branchesRequest = isSuperAdmin
      ? listBranches()
      : getBranch(ownBranchId).then((branch) => branch ? [branch] : []);
    branchesRequest
      .then((branchList) => {
        setBranches(branchList.filter((branch) => branch.status === "active"));
      })
      .catch(() => setError("Não foi possível carregar as coordenações estaduais."));
    recarregar({ branchId: listBranchId });
  }, [isSuperAdmin, listBranchId, ownBranchId, recarregar]);

  useEffect(() => {
    const draft = location.state?.volunteerDraft;
    if (!draft || branches.length === 0) return;
    const branch = branches.find(item => item.id === draft.branchId);
    if (!branch) setError('A coordenação estadual da resposta não está disponível. Selecione uma coordenação estadual ativa.');
    else {
      setShowForm(true);
      setEditingId('');
      setForm({
        ...EMPTY_FORM,
        fullName: typeof draft.fullName === 'string' ? draft.fullName : '',
        email: typeof draft.email === 'string' ? draft.email : '',
        phone: formatPhone(typeof draft.phone === 'string' ? draft.phone : ''),
        cpf: formatCpf(typeof draft.cpf === 'string' ? draft.cpf : ''),
        rg: typeof draft.rg === 'string' ? draft.rg : '',
        birthDate: typeof draft.birthDate === 'string' ? draft.birthDate : '',
      });
      setActionBranchId(branch.id);
      setMessage(`Dados da resposta carregados para ${branch.name}. Confira e complete os campos antes de cadastrar.`);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    navigate(location.pathname, { replace: true, state: null });
  }, [branches, location.pathname, location.state, navigate]);

  function resetForm() {
      setEditingId("");
      setShowForm(true);
    setForm(EMPTY_FORM);
    setActionBranchId(ownBranchId);
  }

  async function completeAddressFromCep(value) {
    const cep = String(value ?? '').replace(/\D/g, '');
    if (cep.length !== 8) return;
    setSearchingCep(true);
    setCepMessage('Buscando endereço…');
    try {
      const result = await findAddressByCep(cep);
      setForm((current) => {
        if (current.address.cep.replace(/\D/g, '') !== cep) return current;
        return {
          ...current,
          address: {
            ...current.address,
            cep: formatCep(result.cep),
            street: result.street,
            neighborhood: result.neighborhood,
            city: result.city,
            state: result.state,
          },
        };
      });
      setCepMessage('Endereço preenchido pelo CEP. Informe apenas o número e, se necessário, o complemento.');
    } catch (cepError) {
      setCepMessage(cepError.message || 'Não foi possível consultar o CEP. Preencha o endereço manualmente.');
    } finally {
      setSearchingCep(false);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (saving || loadingVolunteers) return;
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const regionalIds = [...new Set(form.actionIds.map(id => actionCatalog[id]?.branchId).filter(Boolean))];
      if (form.actionIds.some(id => !actionCatalog[id]?.branchId)) throw new Error('Selecione novamente as ações para confirmar suas coordenações estaduais.');
      const participationDates = [...new Set(form.actionIds.map(id => actionCatalog[id]?.date).filter(Boolean))];
      if (participationDates.length !== form.actionIds.length) throw new Error('O voluntário só pode participar de uma ação por dia.');
      const volunteerInput = { ...form, regionalIds, participationDates };
      const records = createVolunteerRecords(volunteerInput);
      let savedId = editingId;
      if (editingId) {
        await updateVolunteer(editingId, volunteerInput);
        setPrivateData((current) => ({ ...current, [editingId]: { cpf: form.cpf.replace(/\D/g, ""), rg: form.rg.replace(/[^0-9a-z]/gi, "").toUpperCase(), birthDate: form.birthDate, address: form.address, shirtSize: form.shirtSize, ngoRelationship: form.ngoRelationship, lgpdAccepted: form.lgpdAccepted, regulationAccepted: form.regulationAccepted, imageUseAccepted: form.imageUseAccepted, guardianAuthorizationAccepted: form.guardianAuthorizationAccepted } }));
        setMessage("Cadastro atualizado com sucesso.");
      } else {
        savedId = await createVolunteer(volunteerInput);
        setMessage("Voluntário cadastrado com segurança.");
      }
      atualizarDados(current => {
        const previous = current.find(item => item.id === savedId);
        const saved = { ...previous, ...records.publicData, id: savedId };
        return [...current.filter(item => item.id !== savedId), saved].sort((a, b) => a.fullName.localeCompare(b.fullName, "pt-BR"));
      });
      resetForm();
    } catch (saveError) {
      setError(saveError.message || "Não foi possível salvar o voluntário.");
    } finally {
      setSaving(false);
    }
  }

  async function loadDocuments(volunteer) {
    setError("");
    setShowFullCpf(false);
    if (expandedId === volunteer.id) {
      setExpandedId("");
      return;
    }
    try {
      if (!privateData[volunteer.id]) {
        const data = await getVolunteerPrivate(volunteer.id);
        setPrivateData((current) => ({ ...current, [volunteer.id]: data }));
      }
      setExpandedId(volunteer.id);
    } catch {
      setError("Não foi possível carregar os documentos protegidos.");
    }
  }

  async function startEdit(volunteer) {
    setError("");
    try {
      const documents = privateData[volunteer.id] ?? await getVolunteerPrivate(volunteer.id);
      const selectedActions = await getActionsByIds(volunteer.actionIds ?? []);
      setActionCatalog(catalog => ({ ...catalog, ...Object.fromEntries(selectedActions.map(item => [item.id, item])) }));
      setPrivateData((current) => ({ ...current, [volunteer.id]: documents }));
      setEditingId(volunteer.id);
      setShowForm(true);
      setForm({
        fullName: volunteer.fullName, email: volunteer.email, phone: formatPhone(volunteer.phone),
        cpf: formatCpf(documents.cpf), rg: documents.rg, birthDate: documents.birthDate, address: { ...EMPTY_ADDRESS, ...(documents.address ?? {}) }, shirtSize: documents.shirtSize ?? '', ngoRelationship: documents.ngoRelationship ?? '', lgpdAccepted: documents.lgpdAccepted === true, regulationAccepted: documents.regulationAccepted === true, imageUseAccepted: documents.imageUseAccepted === true, guardianAuthorizationAccepted: documents.guardianAuthorizationAccepted === true,
        actionIds: volunteer.actionIds ?? [], status: volunteer.status, accessStatus: volunteer.accessStatus ?? 'none',
      });
      setActionBranchId(volunteer.regionalIds?.[0] ?? ownBranchId);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      setError("Não foi possível abrir o cadastro para edição.");
    }
  }

  async function showVolunteerActions(volunteer) {
    setActionsVolunteer(volunteer);
    setModalActions([]);
    setLoadingModalActions(true);
    try {
      setModalActions(await getActionsByIds(volunteer.actionIds ?? []));
    } catch {
      setError('Não foi possível carregar as ações deste voluntário.');
    } finally { setLoadingModalActions(false); }
  }

  function closeVolunteerActions() {
    setActionsVolunteer(null);
    setModalActions([]);
  }

  async function toggleStatus(volunteer) {
    const status = volunteer.status === "active" ? "blocked" : "active";
    setError("");
    try {
      await updateVolunteerStatus(volunteer.id, status);
      atualizarDados((current) => current.map((item) => item.id === volunteer.id ? { ...item, status, accessStatus: item.accessStatus === 'none' ? 'none' : status } : item));
      setMessage(status === "active" ? "Voluntário reativado." : "Voluntário bloqueado.");
    } catch {
      setError("Não foi possível alterar a situação.");
    }
  }

  async function manageAccess(volunteer, reset = false) {
    setSaving(true); setError(''); setMessage(''); setCredentials(null);
    try {
      const result = reset ? await resetVolunteerPassword(volunteer.id) : await createVolunteerAccess(volunteer.id);
      setCredentials({ fullName: volunteer.fullName, username: result.username, password: result.password });
      atualizarDados(current => current.map(item => item.id === volunteer.id ? { ...item, status: 'active', accessStatus: 'active' } : item));
      setMessage(reset ? 'Nova senha de acesso gerada.' : 'Acesso individual criado. Copie as credenciais agora.');
    } catch (accessError) { setError(accessError.message || 'Não foi possível gerar o acesso.'); }
    finally { setSaving(false); }
  }

  async function removeVolunteer(volunteer) {
    if (!isSuperAdmin || saving || !window.confirm(`Excluir permanentemente ${volunteer.fullName}? O cadastro e os documentos pessoais serão apagados. Esta ação não pode ser desfeita.`)) return;
    setSaving(true); setError(''); setMessage('');
    try {
      await deleteVolunteer(volunteer.id);
      atualizarDados(items => items.filter(item => item.id !== volunteer.id));
      setPrivateData(current => { const next = { ...current }; delete next[volunteer.id]; return next; });
      if (expandedId === volunteer.id) setExpandedId('');
      if (editingId === volunteer.id) resetForm();
      setMessage('Voluntário e documentos pessoais excluídos.');
    } catch { setError('Não foi possível excluir o voluntário. Tente novamente.'); }
    finally { setSaving(false); }
  }

  async function prepareReport(event) {
    event.preventDefault(); setReportLoading(true); setError(''); setReportRows([]); setReportReady(false);
    try {
      const rows = await listVolunteerReport(reportFilter);
      setReportRows(rows); setReportReady(true);
      if (!rows.length) setMessage('Nenhum voluntário encontrado para o filtro selecionado.');
    } catch { setError('Não foi possível preparar o relatório protegido.'); }
    finally { setReportLoading(false); }
  }

  return (
    <main className={styles.page}>
      <PageHeading eyebrow={isSuperAdmin ? "Administração nacional" : "Minha coordenação estadual"} title="Voluntários" meta={<span>{volunteers.length} carregado{volunteers.length === 1 ? "" : "s"}</span>} />

      {!showForm && <button className={styles.formToggle} type="button" onClick={() => setShowForm(true)}>Cadastrar voluntário manualmente</button>}
      {showForm && <section className={styles.card} aria-labelledby="volunteer-form-title">
        <div className={styles.sectionHeading}><h2 id="volunteer-form-title">{editingId ? "Editar voluntário" : "Cadastrar voluntário"}</h2>{!editingId && <button className={styles.secondary} type="button" onClick={() => { resetForm(); setShowForm(false); }}>Recolher</button>}</div>
        <p className={styles.privacy}>CPF, RG e nascimento ficam em uma área protegida e não aparecem nas consultas comuns.</p>
        <form onSubmit={handleSubmit}>
          <label className={styles.wide}>Nome completo<input required minLength="2" maxLength="120" autoComplete="name" value={form.fullName} onChange={(event) => setForm({ ...form, fullName: event.target.value })} /></label>
          <label>E-mail <small>(opcional)</small><ContactInput type="email" maxLength="160" autoComplete="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></label>
          <label>Telefone <small>(opcional)</small><ContactInput type="tel" inputMode="tel" autoComplete="tel" value={form.phone} onChange={(event) => setForm({ ...form, phone: formatPhone(event.target.value) })} /></label>
          <label>CPF<input required inputMode="numeric" autoComplete="off" placeholder="000.000.000-00" value={form.cpf} onChange={(event) => setForm({ ...form, cpf: formatCpf(event.target.value) })} /></label>
          <label>RG<input required minLength="3" maxLength="20" autoComplete="off" value={form.rg} onChange={(event) => setForm({ ...form, rg: event.target.value })} /></label>
          <label>Data de nascimento<input required type="date" autoComplete="bday" max={new Date().toISOString().slice(0, 10)} value={form.birthDate} onChange={(event) => setForm({ ...form, birthDate: event.target.value })} /></label>
          <fieldset className={styles.actionChoices}><legend>Endereço do voluntário</legend><div className={styles.addressGrid}><label>CEP<input required inputMode="numeric" placeholder="00000-000" value={formatCep(form.address.cep)} onChange={event => { const cep = formatCep(event.target.value); setForm(current => ({ ...current, address: { ...current.address, cep } })); setCepMessage(''); if (cep.replace(/\D/g, '').length === 8) completeAddressFromCep(cep); }} />{searchingCep && <small className={styles.cepStatus}>Buscando endereço…</small>}</label><label>Logradouro<input required value={form.address.street} onChange={event => setForm({ ...form, address: { ...form.address, street: event.target.value } })} /></label><label>Número<input required value={form.address.number} onChange={event => setForm({ ...form, address: { ...form.address, number: event.target.value } })} /></label><label>Complemento <small>(opcional)</small><input value={form.address.complement} onChange={event => setForm({ ...form, address: { ...form.address, complement: event.target.value } })} /></label><label>Bairro<input required value={form.address.neighborhood} onChange={event => setForm({ ...form, address: { ...form.address, neighborhood: event.target.value } })} /></label><label>Cidade<input required value={form.address.city} onChange={event => setForm({ ...form, address: { ...form.address, city: event.target.value } })} /></label><label>Estado<select required value={form.address.state} onChange={event => setForm({ ...form, address: { ...form.address, state: event.target.value } })}><option value="">Selecione</option>{BRAZIL_STATES.map(state => <option key={state.code} value={state.code}>{state.code} — {state.name}</option>)}</select></label></div>{cepMessage && <p className={styles.cepStatus} role="status">{cepMessage}</p>}</fieldset>
          <label>Tamanho da camiseta<select required value={form.shirtSize} onChange={event => setForm({ ...form, shirtSize: event.target.value })}><option value="">Selecione</option>{SHIRT_SIZES.map(size => <option key={size} value={size}>{size}</option>)}</select></label>
          <label>Vínculo com a ONG<select required value={form.ngoRelationship} onChange={event => setForm({ ...form, ngoRelationship: event.target.value })}><option value="">Selecione…</option>{NGO_RELATIONSHIPS.map(item => <option key={item} value={item}>{item}</option>)}</select></label>
          <fieldset className={styles.actionChoices}><legend>Confirmações</legend><label><input required type="checkbox" checked={form.lgpdAccepted} onChange={event => setForm({ ...form, lgpdAccepted: event.target.checked })} />Li e aceito o tratamento dos meus dados pessoais conforme a LGPD.</label><div className={styles.regulationAcceptance}><label><input required type="checkbox" checked={form.regulationAccepted} onChange={event => setForm({ ...form, regulationAccepted: event.target.checked })} />Concordo com o Regulamento do Voluntário.</label><button type="button" className={styles.textButton} onClick={() => setShowRegulation(true)}>Ver regulamento</button></div><label><input required type="checkbox" checked={form.imageUseAccepted} onChange={event => setForm({ ...form, imageUseAccepted: event.target.checked })} />Autorizo a divulgação da imagem do voluntário nas fotos e materiais institucionais da ONG Moradia e Cidadania.</label>{isMinorBirthDate(form.birthDate) && <label><input required type="checkbox" checked={form.guardianAuthorizationAccepted} onChange={event => setForm({ ...form, guardianAuthorizationAccepted: event.target.checked })} />Declaro que o responsável legal autorizou a participação do menor e a divulgação de sua imagem.</label>}</fieldset>
          <label>Coordenação estadual para localizar ações<select required disabled={!isSuperAdmin} value={actionBranchId} onChange={(event) => setActionBranchId(event.target.value)}><option value="">Selecione</option>{branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name} · {branch.state}</option>)}</select></label>
          <fieldset className={styles.actionChoices} disabled={!actionBranchId || loadingActions}><legend>Ações <small>(selecione uma ou mais; você pode trocar a coordenação estadual)</small></legend>{loadingActions ? <p>Carregando ações…</p> : actions.length ? actions.map(action => <label key={action.id}><input type="checkbox" checked={form.actionIds.includes(action.id)} onChange={event => setForm({ ...form, actionIds: event.target.checked ? [...new Set([...form.actionIds, action.id])] : form.actionIds.filter(id => id !== action.id) })} />{action.name}</label>) : <p>{actionBranchId ? 'Esta coordenação estadual ainda não possui ações cadastradas.' : 'Selecione uma coordenação estadual para localizar ações.'}</p>}<p><strong>{form.actionIds.length}</strong> ação(ões) selecionada(s) no total.</p></fieldset>
          {editingId && <label>Situação<select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}><option value="active">Ativo</option><option value="blocked">Bloqueado</option></select></label>}
          <div className={styles.formActions}>
            <button className={styles.primary} type="submit" disabled={saving || loadingVolunteers || loadingActions || branches.length === 0 || form.actionIds.length === 0}>{saving ? "Salvando..." : editingId ? "Salvar alterações" : "Cadastrar voluntário"}</button>
            {editingId && <button className={styles.secondary} type="button" onClick={resetForm}>Cancelar</button>}
          </div>
        </form>
        {error && <p className={styles.error} role="alert">{error}</p>}
        {message && <p className={styles.success} role="status">{message}</p>}
        {credentials && <div className={styles.credentials} role="status"><strong>Credenciais de {credentials.fullName}</strong><span>E-mail de acesso: <code>{credentials.username}</code></span><span>Senha inicial: <code>{credentials.password}</code></span><button type="button" onClick={() => navigator.clipboard.writeText(`E-mail de acesso: ${credentials.username}\nSenha inicial: ${credentials.password}`)}>Copiar credenciais</button><small>A senha não será exibida novamente.</small></div>}
      </section>}

      {isSuperAdmin && <section className={`${styles.card} ${styles.reportCard}`} aria-labelledby="volunteer-report-title"><h2 id="volunteer-report-title">Relatório protegido de voluntários</h2><p>CPF e RG são carregados somente ao preparar este relatório. Você pode escolher uma ação específica ou todos os voluntários.</p><form onSubmit={prepareReport}><label>Coordenação estadual<select value={reportFilter.branchId} onChange={event => { const branchId = event.target.value; setReportFilter({ branchId, actionId: 'all' }); setReportReady(false); }}><option value="all">Todas as coordenações estaduais</option>{branches.map(branch => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select></label><label>Ação<select disabled={reportFilter.branchId === 'all'} value={reportFilter.actionId} onChange={event => { setReportFilter(current => ({ ...current, actionId: event.target.value })); setReportReady(false); }}><option value="all">{reportFilter.branchId === 'all' ? 'Todas as ações' : 'Todas as ações desta coordenação'}</option>{reportActions.map(action => <option key={action.id} value={action.id}>{action.name}</option>)}</select></label><div className={styles.formActions}><button className={styles.primary} disabled={reportLoading}>{reportLoading ? 'Preparando…' : 'Gerar relatório'}</button>{reportReady && reportRows.length > 0 && <button className={styles.secondary} type="button" onClick={() => window.print()}>Imprimir relatório ({reportRows.length})</button>}</div></form>{reportReady && <div className={styles.report}><header><h2>Voluntários cadastrados</h2><p>Coordenação estadual: {reportFilter.branchId === 'all' ? 'Todas' : branches.find(branch => branch.id === reportFilter.branchId)?.name}</p><p>Ação: {reportFilter.actionId === 'all' ? 'Todas' : reportActions.find(action => action.id === reportFilter.actionId)?.name}</p><p><strong>Total: {reportRows.length} voluntário{reportRows.length === 1 ? '' : 's'}</strong></p></header><table><thead><tr><th>Nome</th><th>CPF</th><th>RG</th><th>Telefone</th><th>E-mail</th></tr></thead><tbody>{reportRows.map(row => <tr key={row.id}><td>{row.fullName}</td><td>{formatCpf(row.cpf)}</td><td>{row.rg}</td><td>{formatPhone(row.phone) || '—'}</td><td>{row.email || '—'}</td></tr>)}</tbody></table></div>}</section>}

      <section className={styles.card} aria-labelledby="volunteer-list-title">
        <h2 id="volunteer-list-title">Voluntários cadastrados</h2>
        {listError && <div className={styles.listError} role="alert"><p>Não foi possível carregar os voluntários.</p><button type="button" onClick={() => recarregar({ branchId: listBranchId })}>Tentar novamente</button></div>}
        {loadingVolunteers && volunteers.length === 0 ? <p aria-busy="true">Carregando...</p> : volunteers.length === 0 ? <p>Nenhum voluntário cadastrado.</p> : (
          <div className={styles.list}>{volunteers.map((volunteer) => {
            const documents = privateData[volunteer.id];
            return <article className={styles.volunteer} key={volunteer.id}>
              <div className={styles.summary}><div><h3>{volunteer.fullName}</h3><p>{(volunteer.actionIds ?? []).length} ação(ões) · {(volunteer.regionalIds ?? []).length} coordenação(ões) estadual(is)</p></div><span className={volunteer.status === "active" ? styles.active : styles.blocked}>{volunteer.status === "active" ? "Ativo" : "Bloqueado"}</span></div>
              <div className={styles.contact}><span>{volunteer.email || "Sem e-mail"}</span><span>{formatPhone(volunteer.phone) || "Sem telefone"}</span></div>
              {expandedId === volunteer.id && documents && <div className={styles.documents}>
                <div><span>CPF</span><strong>{showFullCpf ? formatCpf(documents.cpf) : maskCpf(documents.cpf)}</strong></div>
                <div><span>RG</span><strong>{documents.rg}</strong></div>
                <div><span>Nascimento</span><strong>{documents.birthDate.split("-").reverse().join("/")}</strong></div><div><span>Camiseta</span><strong>{documents.shirtSize || 'Não informado'}</strong></div><div><span>Vínculo com a ONG</span><strong>{documents.ngoRelationship || 'Não informado'}</strong></div>{documents.address && <div className={styles.wideDocument}><span>Endereço</span><strong>{[documents.address.street, documents.address.number, documents.address.complement, documents.address.neighborhood, documents.address.city, documents.address.state, documents.address.cep && `CEP ${formatCep(documents.address.cep)}`].filter(Boolean).join(', ')}</strong></div>}
                <button type="button" className={styles.textButton} onClick={() => setShowFullCpf((current) => !current)}>{showFullCpf ? "Ocultar CPF" : "Mostrar CPF completo"}</button>
              </div>}
              <div className={styles.actions}><button type="button" onClick={() => showVolunteerActions(volunteer)}>Ver ações</button><button type="button" onClick={() => loadDocuments(volunteer)}>{expandedId === volunteer.id ? "Ocultar documentos" : "Ver documentos"}</button><button type="button" onClick={() => startEdit(volunteer)}>Editar</button><button type="button" onClick={() => toggleStatus(volunteer)}>{volunteer.status === "active" ? "Bloquear" : "Reativar"}</button>{isSuperAdmin && (volunteer.accessStatus === 'active' || volunteer.accessStatus === 'blocked' ? <button type="button" disabled={saving} onClick={() => manageAccess(volunteer, true)}>Gerar nova senha</button> : <button type="button" disabled={saving} onClick={() => manageAccess(volunteer)}>Criar acesso individual</button>)}{isSuperAdmin && <button type="button" disabled={saving} onClick={() => removeVolunteer(volunteer)}>Excluir voluntário</button>}</div>
            </article>;
          })}</div>
        )}
        {volunteers.length > 0 && hasMore && <button className={styles.loadMore} type="button" disabled={loadingVolunteers || saving} onClick={carregarMais}>{loadingVolunteers ? "Carregando..." : "Carregar mais voluntários"}</button>}
      </section>
      {actionsVolunteer && createPortal(<div className={styles.modalBackdrop} role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) closeVolunteerActions(); }}><section className={styles.actionsModal} role="dialog" aria-modal="true" aria-labelledby="volunteer-actions-title" onMouseDown={event => event.stopPropagation()}><header><div><p>Ações do voluntário</p><h2 id="volunteer-actions-title">{actionsVolunteer.fullName}</h2></div><button type="button" aria-label="Fechar ações" onClick={closeVolunteerActions}>×</button></header>{loadingModalActions ? <p>Carregando ações…</p> : modalActions.length === 0 ? <p>Este voluntário não está vinculado a nenhuma ação.</p> : <div className={styles.modalActionList}>{modalActions.map(action => <article key={action.id}><h3>{action.name}</h3><p>{actionScheduleSummary(action)}</p><p>{action.address?.city}/{action.address?.state} · {action.address?.street}, {action.address?.number}</p></article>)}</div>}</section></div>, document.body)}
      <VolunteerRegulation open={showRegulation} onClose={() => setShowRegulation(false)} />
    </main>
  );
}
