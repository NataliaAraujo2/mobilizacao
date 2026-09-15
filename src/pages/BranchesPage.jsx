import { useEffect, useState } from "react";
import { BRANCH_STATUSES } from "../domain/access/access";
import { BRAZIL_STATES } from "../domain/locations/brazilStates";
import { addBranch, editBranch, listBranches } from "../services/branchesService";
import styles from "./BranchesPage.module.css";

const EMPTY_FORM = { name: "", code: "", state: "", status: BRANCH_STATUSES.ACTIVE };

export default function BranchesPage() {
  const [branches, setBranches] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    listBranches()
      .then(setBranches)
      .catch(() => setError("Não foi possível carregar as coordenações estaduais."))
      .finally(() => setLoading(false));
  }, []);

  function startEdit(branch) {
    setEditingId(branch.id);
    setForm({ name: branch.name, code: branch.code, state: branch.state, status: branch.status });
    setMessage("");
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setError("");
  }

  function changeState(state) {
    setForm((current) => ({ ...current, state, code: editingId ? current.code : state }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");

    try {
      if (editingId) {
        const saved = await editBranch(editingId, form);
        setBranches((current) => current
          .map((branch) => branch.id === editingId ? { ...branch, ...saved } : branch)
          .sort((a, b) => a.name.localeCompare(b.name, "pt-BR")));
        setMessage("Coordenação estadual atualizada com sucesso.");
      } else {
        const saved = await addBranch(form);
        setBranches((current) => [...current, saved].sort((a, b) => a.name.localeCompare(b.name, "pt-BR")));
        setMessage("Coordenação estadual cadastrada com sucesso.");
      }

      setEditingId(null);
      setForm(EMPTY_FORM);
    } catch (saveError) {
      setError(saveError.code === "branch/already-exists" ? saveError.message : "Não foi possível salvar a coordenação estadual.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus(branch) {
    const nextStatus = branch.status === BRANCH_STATUSES.ACTIVE ? BRANCH_STATUSES.INACTIVE : BRANCH_STATUSES.ACTIVE;
    setError("");
    setMessage("");

    try {
      const saved = await editBranch(branch.id, { ...branch, status: nextStatus });
      setBranches((current) => current.map((item) => item.id === branch.id ? { ...item, ...saved } : item));
      setMessage(nextStatus === BRANCH_STATUSES.ACTIVE ? "Coordenação estadual reativada." : "Coordenação estadual inativada.");
    } catch {
      setError("Não foi possível alterar a situação da coordenação estadual.");
    }
  }

  return (
    <main className={styles.page}>
      <header className={styles.title}>
        <div><p>Administração nacional</p><h1>Coordenações estaduais</h1></div>
        <span>{branches.length} cadastrada{branches.length === 1 ? "" : "s"}</span>
      </header>

      <section className={styles.formCard} aria-labelledby="branch-form-title">
        <h2 id="branch-form-title">{editingId ? "Editar coordenação estadual" : "Cadastrar coordenação estadual"}</h2>
        <form onSubmit={handleSubmit}>
          <label>Nome<input required minLength="2" maxLength="120" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>
          <label>Código<input required minLength="2" maxLength="30" disabled={Boolean(editingId)} placeholder="Ex.: SP ou SP_02" value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value.toUpperCase() })} /><small>Preenchido pela UF; ajuste apenas se houver outra coordenação estadual no estado.</small></label>
          <label>Estado<select required value={form.state} onChange={(event) => changeState(event.target.value)}><option value="">Selecione</option>{BRAZIL_STATES.map((state) => <option key={state.code} value={state.code}>{state.code} — {state.name}</option>)}</select></label>
          {editingId && <label>Situação<select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}><option value="active">Ativa</option><option value="inactive">Inativa</option></select></label>}
          <div className={styles.actions}>
            <button className={styles.primary} type="submit" disabled={saving}>{saving ? "Salvando..." : editingId ? "Salvar alterações" : "Cadastrar coordenação estadual"}</button>
            {editingId && <button className={styles.secondary} type="button" onClick={cancelEdit}>Cancelar</button>}
          </div>
        </form>
        {error && <p className={styles.error} role="alert">{error}</p>}
        {message && <p className={styles.success} role="status">{message}</p>}
      </section>

      <section className={styles.listCard} aria-labelledby="branches-title">
        <h2 id="branches-title">Coordenações estaduais cadastradas</h2>
        {loading ? <p aria-busy="true">Carregando...</p> : branches.length === 0 ? <p>Nenhuma coordenação estadual cadastrada.</p> : (
          <div className={styles.list}>
            {branches.map((branch) => (
              <article key={branch.id} className={styles.branch}>
                <div><h3>{branch.name}</h3><p>{branch.code} · {branch.state}</p></div>
                <span className={branch.status === "active" ? styles.active : styles.inactive}>{branch.status === "active" ? "Ativa" : "Inativa"}</span>
                <div className={styles.rowActions}>
                  <button type="button" onClick={() => startEdit(branch)}>Editar</button>
                  <button type="button" onClick={() => toggleStatus(branch)}>{branch.status === "active" ? "Inativar" : "Reativar"}</button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
