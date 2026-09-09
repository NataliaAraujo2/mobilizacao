import { useEffect, useMemo, useState } from "react";
import { listBranches } from "../services/branchesService";
import { createBranchViewer, listBranchViewers, resetBranchViewerPassword, updateBranchViewer, updateBranchViewerContact } from "../services/branchViewersService";
import styles from "./BranchViewersPage.module.css";

const ERROR_MESSAGES = {
  "functions/already-exists": "Esta filial já possui um acesso de consulta.",
  "functions/not-found": "A filial ou o acesso não foi encontrado.",
  "functions/permission-denied": "Você não tem permissão para gerenciar estes acessos.",
  "functions/unavailable": "O serviço local não está disponível. Verifique os emuladores.",
};
const EMPTY_CONTACT = { branchId: "", contactName: "", contactEmail: "", contactPhone: "" };

function formatPhone(value) {
  const phone = value.replace(/\D/g, "").slice(0, 13);
  if (phone.length <= 10) return phone.replace(/(\d{2})(\d{4})(\d+)/, "($1) $2-$3");
  return phone.replace(/(\d{2})(\d{5})(\d+)/, "($1) $2-$3");
}

export default function BranchViewersPage() {
  const [branches, setBranches] = useState([]);
  const [viewers, setViewers] = useState([]);
  const [credentials, setCredentials] = useState(null);
  const [pendingReset, setPendingReset] = useState("");
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [contactForm, setContactForm] = useState(EMPTY_CONTACT);
  const [editingContact, setEditingContact] = useState("");

  useEffect(() => {
    Promise.all([listBranches(), listBranchViewers()])
      .then(([branchList, viewerList]) => {
        setBranches(branchList.filter((branch) => branch.status === "active"));
        setViewers(viewerList);
      })
      .catch(() => setError("Não foi possível carregar os acessos e filiais."))
      .finally(() => setLoading(false));
  }, []);

  const viewerByBranch = useMemo(() => new Map(viewers.map((viewer) => [viewer.branchId, viewer])), [viewers]);

  function beginAction(key) {
    setBusy(key);
    setError("");
    setMessage("");
    setCredentials(null);
  }

  function fail(actionError, fallback) {
    setError(ERROR_MESSAGES[actionError.code] ?? fallback);
    setBusy("");
  }

  async function generateAccess(event, branch) {
    event.preventDefault();
    beginAction(`create-${branch.id}`);
    try {
      const input = { ...contactForm, branchId: branch.id, contactPhone: contactForm.contactPhone.replace(/\D/g, "") };
      const result = await createBranchViewer(input);
      setViewers((current) => [...current, { id: result.uid, displayName: result.username, ...input, role: "branchViewer", status: "active" }]);
      setCredentials({ ...result, branchName: branch.name });
      setContactForm(EMPTY_CONTACT);
      setMessage("Acesso criado. Copie os dados antes de sair desta tela.");
      setBusy("");
    } catch (actionError) {
      fail(actionError, "Não foi possível gerar o acesso.");
    }
  }

  async function saveContact(event, viewer) {
    event.preventDefault();
    beginAction(`contact-${viewer.id}`);
    const contact = { ...contactForm, contactPhone: contactForm.contactPhone.replace(/\D/g, "") };
    delete contact.branchId;
    try {
      const updated = await updateBranchViewerContact(viewer.id, contact);
      setViewers((current) => current.map((item) => item.id === viewer.id ? { ...item, ...updated } : item));
      setEditingContact("");
      setContactForm(EMPTY_CONTACT);
      setMessage("Dados da pessoa responsável atualizados.");
      setBusy("");
    } catch (actionError) {
      fail(actionError, "Não foi possível atualizar os dados de contato.");
    }
  }

  function startContactForm(branch, viewer = null) {
    setEditingContact(viewer?.id ?? `new-${branch.id}`);
    setContactForm(viewer ? {
      branchId: branch.id,
      contactName: viewer.contactName ?? "",
      contactEmail: viewer.contactEmail ?? "",
      contactPhone: formatPhone(viewer.contactPhone ?? ""),
    } : { ...EMPTY_CONTACT, branchId: branch.id });
  }

  function cancelContactForm() {
    setEditingContact("");
    setContactForm(EMPTY_CONTACT);
  }

  async function changeStatus(viewer) {
    beginAction(`status-${viewer.id}`);
    const status = viewer.status === "active" ? "blocked" : "active";
    try {
      await updateBranchViewer(viewer.id, status);
      setViewers((current) => current.map((item) => item.id === viewer.id ? { ...item, status } : item));
      setMessage(status === "active" ? "Acesso reativado." : "Acesso bloqueado.");
      setBusy("");
    } catch (actionError) {
      fail(actionError, "Não foi possível alterar o acesso.");
    }
  }

  async function resetPassword(viewer, branch) {
    beginAction(`reset-${viewer.id}`);
    try {
      const result = await resetBranchViewerPassword(viewer.id);
      setCredentials({ ...result, branchName: branch.name });
      setPendingReset("");
      setMessage("Nova senha criada. A senha anterior não funciona mais.");
      setBusy("");
    } catch (actionError) {
      fail(actionError, "Não foi possível gerar uma nova senha.");
    }
  }

  async function copyCredentials() {
    if (!credentials) return;
    await navigator.clipboard.writeText(`Usuário: ${credentials.username}\nSenha: ${credentials.password}`);
    setMessage("Usuário e senha copiados.");
  }

  return (
    <main className={styles.page}>
      <header className={styles.title}>
        <div><p>Administração nacional</p><h1>Administradores das filiais</h1></div>
        <span>{viewers.length} gerado{viewers.length === 1 ? "" : "s"}</span>
      </header>

      <section className={styles.intro}>
        <h2>Um acesso compartilhado por filial</h2>
        <p>Essas contas podem consultar e imprimir a listagem da própria filial. Elas não podem cadastrar, editar ou apagar dados.</p>
        <p>As senhas usam três palavras curtas e dois números, sem dados pessoais e sem caracteres difíceis de digitar.</p>
      </section>

      {credentials && (
        <section className={styles.credentials} aria-live="polite">
          <div><span>Filial</span><strong>{credentials.branchName}</strong></div>
          <div><span>Usuário</span><strong>{credentials.username}</strong></div>
          <div><span>Senha temporária</span><strong>{credentials.password}</strong></div>
          <button type="button" onClick={copyCredentials}>Copiar usuário e senha</button>
          <p>Guarde agora: por segurança, a senha não fica salva para consulta.</p>
        </section>
      )}

      {error && <p className={styles.error} role="alert">{error}</p>}
      {message && <p className={styles.success} role="status">{message}</p>}

      <section className={styles.card} aria-labelledby="branches-title">
        <h2 id="branches-title">Filiais</h2>
        {loading ? <p aria-busy="true">Carregando...</p> : branches.length === 0 ? <p>Nenhuma filial ativa cadastrada.</p> : (
          <div className={styles.list}>
            {branches.map((branch) => {
              const viewer = viewerByBranch.get(branch.id);
              return (
                <article className={styles.item} key={branch.id}>
                  <div className={styles.identity}><h3>{branch.name}</h3><p>{branch.state} · {viewer?.displayName ?? `USUARIO_${branch.state}`}</p>{viewer && <small>Responsável: {viewer.contactName || "Não informado"}<br />{viewer.contactPhone ? formatPhone(viewer.contactPhone) : "Sem telefone"} · {viewer.contactEmail || "Sem e-mail"}</small>}</div>
                  {!viewer ? (
                    editingContact === `new-${branch.id}` ? <form className={styles.contactForm} onSubmit={(event) => generateAccess(event, branch)}>
                      <label>Nome da pessoa responsável<input required minLength="2" maxLength="120" autoComplete="name" value={contactForm.contactName} onChange={(event) => setContactForm({ ...contactForm, contactName: event.target.value })} /></label>
                      <label>Telefone para contato<input required type="tel" inputMode="tel" autoComplete="tel" value={contactForm.contactPhone} onChange={(event) => setContactForm({ ...contactForm, contactPhone: formatPhone(event.target.value) })} /></label>
                      <label>E-mail para contato<input required type="email" maxLength="160" autoComplete="email" value={contactForm.contactEmail} onChange={(event) => setContactForm({ ...contactForm, contactEmail: event.target.value })} /></label>
                      <div><button type="submit" disabled={Boolean(busy)}>{busy === `create-${branch.id}` ? "Gerando..." : "Gerar acesso"}</button><button type="button" onClick={cancelContactForm}>Cancelar</button></div>
                    </form> : <button type="button" disabled={Boolean(busy)} onClick={() => startContactForm(branch)}>Cadastrar responsável</button>
                  ) : (
                    <>
                      <span className={viewer.status === "active" ? styles.active : styles.blocked}>{viewer.status === "active" ? "Ativo" : "Bloqueado"}</span>
                      <button type="button" disabled={Boolean(busy)} onClick={() => changeStatus(viewer)}>{viewer.status === "active" ? "Bloquear" : "Reativar"}</button>
                      {pendingReset === viewer.id ? (
                        <div className={styles.confirm}><button type="button" disabled={Boolean(busy)} onClick={() => resetPassword(viewer, branch)}>{busy === `reset-${viewer.id}` ? "Gerando..." : "Confirmar nova senha"}</button><button type="button" onClick={() => setPendingReset("")}>Cancelar</button></div>
                      ) : <button className={styles.secondary} type="button" disabled={Boolean(busy)} onClick={() => setPendingReset(viewer.id)}>Gerar nova senha</button>}
                      <button className={styles.secondary} type="button" disabled={Boolean(busy)} onClick={() => startContactForm(branch, viewer)}>Editar contato</button>
                      {editingContact === viewer.id && <form className={styles.contactForm} onSubmit={(event) => saveContact(event, viewer)}>
                        <label>Nome da pessoa responsável<input required minLength="2" maxLength="120" value={contactForm.contactName} onChange={(event) => setContactForm({ ...contactForm, contactName: event.target.value })} /></label>
                        <label>Telefone para contato<input required type="tel" inputMode="tel" value={contactForm.contactPhone} onChange={(event) => setContactForm({ ...contactForm, contactPhone: formatPhone(event.target.value) })} /></label>
                        <label>E-mail para contato<input required type="email" maxLength="160" value={contactForm.contactEmail} onChange={(event) => setContactForm({ ...contactForm, contactEmail: event.target.value })} /></label>
                        <div><button type="submit" disabled={Boolean(busy)}>Salvar contato</button><button type="button" onClick={cancelContactForm}>Cancelar</button></div>
                      </form>}
                    </>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
