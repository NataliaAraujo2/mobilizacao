import { formatPhone } from '../../functions/contactFields.js';
import ContactInput from '../components/ContactInput';
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../auth/useAuth";
import { maskCpf } from "../domain/volunteers/volunteerModel";
import { getBranch, listBranches } from "../services/branchesService";
import { createVolunteer, deleteVolunteer, getVolunteerPrivate, listVolunteersPage, updateVolunteer, updateVolunteerStatus } from "../services/volunteersService";
import { useInfiniteScroll } from "../shared/hooks/useInfiniteScroll";
import styles from "./VolunteersPage.module.css";

const EMPTY_FORM = { fullName: "", email: "", phone: "", cpf: "", rg: "", birthDate: "", branchId: "", status: "active" };

function formatCpf(value) {
  return value.replace(/\D/g, "").slice(0, 11).replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}



export default function VolunteersPage() {
  const { claims } = useAuth();
  const isSuperAdmin = claims?.role === "superAdmin";
  const ownBranchId = claims?.branchId ?? "";
  const listBranchId = isSuperAdmin ? null : ownBranchId;
  const [branches, setBranches] = useState([]);
  const [privateData, setPrivateData] = useState({});
  const [expandedId, setExpandedId] = useState("");
  const [showFullCpf, setShowFullCpf] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM, branchId: ownBranchId });
  const [editingId, setEditingId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

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
  } = useInfiniteScroll(buscarPagina);

  useEffect(() => {
    const branchesRequest = isSuperAdmin
      ? listBranches()
      : getBranch(ownBranchId).then((branch) => branch ? [branch] : []);
    branchesRequest
      .then((branchList) => {
        setBranches(branchList.filter((branch) => branch.status === "active"));
      })
      .catch(() => setError("Não foi possível carregar as regionais."));
    recarregar({ branchId: listBranchId });
  }, [isSuperAdmin, listBranchId, ownBranchId, recarregar]);

  const branchNames = useMemo(() => new Map(branches.map((branch) => [branch.id, branch.name])), [branches]);

  function resetForm() {
    setEditingId("");
    setForm({ ...EMPTY_FORM, branchId: ownBranchId });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    try {
      if (editingId) {
        await updateVolunteer(editingId, form);
        setPrivateData((current) => ({ ...current, [editingId]: { cpf: form.cpf.replace(/\D/g, ""), rg: form.rg.replace(/[^0-9a-z]/gi, "").toUpperCase(), birthDate: form.birthDate } }));
        setMessage("Cadastro atualizado com sucesso.");
      } else {
        await createVolunteer(form);
        setMessage("Voluntário cadastrado com segurança.");
      }
      await recarregar({ branchId: listBranchId });
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
      setPrivateData((current) => ({ ...current, [volunteer.id]: documents }));
      setEditingId(volunteer.id);
      setForm({
        fullName: volunteer.fullName, email: volunteer.email, phone: formatPhone(volunteer.phone),
        cpf: formatCpf(documents.cpf), rg: documents.rg, birthDate: documents.birthDate,
        branchId: volunteer.branchId, status: volunteer.status,
      });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      setError("Não foi possível abrir o cadastro para edição.");
    }
  }

  async function toggleStatus(volunteer) {
    const status = volunteer.status === "active" ? "blocked" : "active";
    setError("");
    try {
      await updateVolunteerStatus(volunteer.id, status);
      atualizarDados((current) => current.map((item) => item.id === volunteer.id ? { ...item, status } : item));
      setMessage(status === "active" ? "Voluntário reativado." : "Voluntário bloqueado.");
    } catch {
      setError("Não foi possível alterar a situação.");
    }
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

  return (
    <main className={styles.page}>
      <header className={styles.title}>
        <div><p>{isSuperAdmin ? "Administração nacional" : "Minha regional"}</p><h1>Voluntários</h1></div>
        <span>{volunteers.length} carregado{volunteers.length === 1 ? "" : "s"}</span>
      </header>

      <section className={styles.card} aria-labelledby="volunteer-form-title">
        <h2 id="volunteer-form-title">{editingId ? "Editar voluntário" : "Cadastrar voluntário"}</h2>
        <p className={styles.privacy}>CPF, RG e nascimento ficam em uma área protegida e não aparecem nas consultas comuns.</p>
        <form onSubmit={handleSubmit}>
          <label className={styles.wide}>Nome completo<input required minLength="2" maxLength="120" autoComplete="name" value={form.fullName} onChange={(event) => setForm({ ...form, fullName: event.target.value })} /></label>
          <label>E-mail <small>(opcional)</small><ContactInput type="email" maxLength="160" autoComplete="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></label>
          <label>Telefone <small>(opcional)</small><ContactInput type="tel" inputMode="tel" autoComplete="tel" value={form.phone} onChange={(event) => setForm({ ...form, phone: formatPhone(event.target.value) })} /></label>
          <label>CPF<input required inputMode="numeric" autoComplete="off" placeholder="000.000.000-00" value={form.cpf} onChange={(event) => setForm({ ...form, cpf: formatCpf(event.target.value) })} /></label>
          <label>RG<input required minLength="3" maxLength="20" autoComplete="off" value={form.rg} onChange={(event) => setForm({ ...form, rg: event.target.value })} /></label>
          <label>Data de nascimento<input required type="date" autoComplete="bday" max={new Date().toISOString().slice(0, 10)} value={form.birthDate} onChange={(event) => setForm({ ...form, birthDate: event.target.value })} /></label>
          <label>Regional<select required disabled={!isSuperAdmin || Boolean(editingId)} value={form.branchId} onChange={(event) => setForm({ ...form, branchId: event.target.value })}><option value="">Selecione</option>{branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name} · {branch.state}</option>)}</select></label>
          {editingId && <label>Situação<select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}><option value="active">Ativo</option><option value="blocked">Bloqueado</option></select></label>}
          <div className={styles.formActions}>
            <button className={styles.primary} type="submit" disabled={saving || branches.length === 0}>{saving ? "Salvando..." : editingId ? "Salvar alterações" : "Cadastrar voluntário"}</button>
            {editingId && <button className={styles.secondary} type="button" onClick={resetForm}>Cancelar</button>}
          </div>
        </form>
        {error && <p className={styles.error} role="alert">{error}</p>}
        {message && <p className={styles.success} role="status">{message}</p>}
      </section>

      <section className={styles.card} aria-labelledby="volunteer-list-title">
        <h2 id="volunteer-list-title">Voluntários cadastrados</h2>
        {listError && <div className={styles.listError} role="alert"><p>Não foi possível carregar os voluntários.</p><button type="button" onClick={() => recarregar({ branchId: listBranchId })}>Tentar novamente</button></div>}
        {loadingVolunteers && volunteers.length === 0 ? <p aria-busy="true">Carregando...</p> : volunteers.length === 0 ? <p>Nenhum voluntário cadastrado.</p> : (
          <div className={styles.list}>{volunteers.map((volunteer) => {
            const documents = privateData[volunteer.id];
            return <article className={styles.volunteer} key={volunteer.id}>
              <div className={styles.summary}><div><h3>{volunteer.fullName}</h3><p>{branchNames.get(volunteer.branchId) ?? volunteer.branchId}</p></div><span className={volunteer.status === "active" ? styles.active : styles.blocked}>{volunteer.status === "active" ? "Ativo" : "Bloqueado"}</span></div>
              <div className={styles.contact}><span>{volunteer.email || "Sem e-mail"}</span><span>{formatPhone(volunteer.phone) || "Sem telefone"}</span></div>
              {expandedId === volunteer.id && documents && <div className={styles.documents}>
                <div><span>CPF</span><strong>{showFullCpf ? formatCpf(documents.cpf) : maskCpf(documents.cpf)}</strong></div>
                <div><span>RG</span><strong>{documents.rg}</strong></div>
                <div><span>Nascimento</span><strong>{documents.birthDate.split("-").reverse().join("/")}</strong></div>
                <button type="button" className={styles.textButton} onClick={() => setShowFullCpf((current) => !current)}>{showFullCpf ? "Ocultar CPF" : "Mostrar CPF completo"}</button>
              </div>}
              <div className={styles.actions}><button type="button" onClick={() => loadDocuments(volunteer)}>{expandedId === volunteer.id ? "Ocultar documentos" : "Ver documentos"}</button><button type="button" onClick={() => startEdit(volunteer)}>Editar</button><button type="button" onClick={() => toggleStatus(volunteer)}>{volunteer.status === "active" ? "Bloquear" : "Reativar"}</button>{isSuperAdmin && <button type="button" disabled={saving} onClick={() => removeVolunteer(volunteer)}>Excluir voluntário</button>}</div>
            </article>;
          })}</div>
        )}
        {volunteers.length > 0 && hasMore && <button className={styles.loadMore} type="button" disabled={loadingVolunteers} onClick={carregarMais}>{loadingVolunteers ? "Carregando..." : "Carregar mais voluntários"}</button>}
      </section>
    </main>
  );
}
