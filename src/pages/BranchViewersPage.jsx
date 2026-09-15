import { formatPhone } from '../../functions/contactFields.js';
import ContactInput from '../components/ContactInput';
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { deleteBranchViewer } from '../services/branchViewersService';
import { getBranch, listBranches } from "../services/branchesService";
import { createBranchViewer, getBranchViewerByBranch, listBranchViewers, resetBranchViewerPassword, updateBranchViewer, updateBranchViewerContact } from "../services/branchViewersService";
import { whatsappUrl } from "../utils/whatsapp";
import styles from "./BranchViewersPage.module.css";

const ERROR_MESSAGES = {
  "functions/already-exists": "Esta coordenação estadual já possui um acesso de consulta.",
  "functions/not-found": "A coordenação estadual ou o acesso não foi encontrado.",
  "functions/permission-denied": "Você não tem permissão para gerenciar estes acessos.",
  "functions/unavailable": "O serviço local não está disponível. Verifique os emuladores.",
};
const EMPTY_CONTACT = { branchId: "", contactName: "", contactEmail: "", contactPhone: "" };



export default function BranchViewersPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const responsibleDraft = useRef(location.state?.responsibleDraft).current;
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
    const branchId = responsibleDraft?.branchId;
    const requests = branchId
      ? [getBranch(branchId).then(branch => branch ? [branch] : []), getBranchViewerByBranch(branchId).then(viewer => viewer ? [viewer] : [])]
      : [listBranches(), listBranchViewers()];
    Promise.all(requests)
      .then(([branchList, viewerList]) => {
        setBranches(branchList.filter((branch) => branch.status === "active"));
        setViewers(viewerList);
      })
      .catch(() => setError("Não foi possível carregar os acessos e coordenações estaduais."))
      .finally(() => setLoading(false));
  }, [responsibleDraft]);

  const viewerByBranch = useMemo(() => new Map(viewers.map((viewer) => [viewer.branchId, viewer])), [viewers]);

  useEffect(() => {
    const draft = responsibleDraft;
    if (loading || !draft) return;
    const branch = branches.find(item => item.id === draft.branchId);
    if (!branch) setError('A coordenação estadual da resposta não está disponível. Selecione uma coordenação estadual ativa.');
    else {
      const viewer = viewerByBranch.get(branch.id);
      setEditingContact(viewer?.id ?? `new-${branch.id}`);
      setContactForm({ branchId: branch.id, ...Object.fromEntries(['contactName', 'contactEmail', 'contactPhone'].map(key => [key, typeof draft[key] === 'string' ? draft[key] : viewer?.[key] ?? ''])) });
      setMessage(`Dados da resposta carregados para ${branch.name}. Confira os campos e confirme ${viewer ? 'em Salvar contato' : 'em Gerar acesso'}.`);
    }
    navigate(location.pathname, { replace: true, state: null });
  }, [loading, branches, viewerByBranch, responsibleDraft, location.pathname, navigate]);

  useEffect(() => {
    if (editingContact) document.getElementById('responsible-contact-form')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [editingContact]);

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
      setCredentials({ ...result, branchName: branch.name, contactPhone: input.contactPhone });
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
      setCredentials({ ...result, branchName: branch.name, contactPhone: viewer.contactPhone });
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

  function shareCredentials() {
    if (!credentials) return;
    const url = whatsappUrl(credentials.contactPhone, `Olá, ${credentials.branchName}!\n\nSeu acesso à MobilizAÇÃO foi criado.\nUsuário: ${credentials.username}\nSenha temporária: ${credentials.password}\n\nAcesse: ${window.location.origin}/login`);
    if (!url) { setError('Cadastre o telefone do responsável antes de compartilhar pelo WhatsApp.'); return; }
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  async function removeResponsible(viewer, branch) {
    if (busy || !window.confirm(`Excluir ${viewer.contactName || viewer.displayName}, responsável por ${branch.name}? O contato e seu acesso serão apagados permanentemente. A coordenação estadual e seus voluntários serão mantidos.`)) return;
    beginAction(`delete-${viewer.id}`);
    try {
      await deleteBranchViewer(viewer.id);
      setViewers(current => current.filter(item => item.id !== viewer.id));
      if (editingContact === viewer.id) cancelContactForm();
      setPendingReset(''); setBusy('');
      setMessage('Responsável e acesso excluídos. Você já pode cadastrar outro responsável.');
    } catch (err) { fail(err, 'Não foi possível excluir o responsável. Tente novamente.'); }
  }

  return (
    <main className={styles.page}>
      <header className={styles.title}>
        <div><p>Administração nacional</p><h1>Administradores das coordenações estaduais</h1></div>
        <span>{viewers.length} gerado{viewers.length === 1 ? "" : "s"}</span>
      </header>

      <section className={styles.intro}>
        <h2>Um acesso compartilhado por coordenação estadual</h2>
        <p>Essas contas podem consultar e imprimir a listagem da própria coordenação estadual. Elas não podem cadastrar, editar ou apagar dados.</p>
        <p>As senhas usam três palavras curtas e dois números, sem dados pessoais e sem caracteres difíceis de digitar.</p>
      </section>

      {credentials && (
        <div className={styles.modalBackdrop} role="presentation">
          <section className={styles.credentials} role="dialog" aria-modal="true" aria-labelledby="credentials-title" aria-live="polite">
            <p className={styles.credentialsEyebrow}>Acesso criado</p>
            <h2 id="credentials-title">Guarde as credenciais agora</h2>
            <div><span>Coordenação estadual</span><strong>{credentials.branchName}</strong></div>
            <div><span>Usuário</span><strong>{credentials.username}</strong></div>
            <div><span>Senha temporária</span><strong>{credentials.password}</strong></div>
            <div className={styles.credentialsActions}><button type="button" onClick={copyCredentials}>Copiar usuário e senha</button><button type="button" onClick={shareCredentials}>Enviar pelo WhatsApp</button></div>
            <p>Por segurança, a senha não fica salva para consulta. Depois de copiar ou compartilhar, feche esta janela.</p>
            <button className={styles.closeCredentials} type="button" onClick={() => setCredentials(null)}>Fechar após guardar</button>
          </section>
        </div>
      )}

      {error && <p className={styles.error} role="alert">{error}</p>}
      {message && <p className={styles.success} role="status">{message}</p>}

      <section className={styles.card} aria-labelledby="branches-title">
        <h2 id="branches-title">Coordenações estaduais</h2>
        {loading ? <p aria-busy="true">Carregando...</p> : branches.length === 0 ? <p>Nenhuma coordenação estadual ativa cadastrada.</p> : (
          <div className={styles.list}>
            {branches.map((branch) => {
              const viewer = viewerByBranch.get(branch.id);
              return (
                <article className={styles.item} key={branch.id}>
                  <div className={styles.identity}><h3>{branch.name}</h3><p>{branch.state} · {viewer?.displayName ?? "usuário será gerado automaticamente"}</p>{viewer && <small>Responsável: {viewer.contactName || "Não informado"}<br />{viewer.contactPhone ? formatPhone(viewer.contactPhone) : "Sem telefone"} · {viewer.contactEmail || "Sem e-mail"}</small>}</div>
                  {!viewer ? (
                    editingContact === `new-${branch.id}` ? <form id="responsible-contact-form" className={styles.contactForm} onSubmit={(event) => generateAccess(event, branch)}>
                      <label>Nome da pessoa responsável<input required minLength="2" maxLength="120" autoComplete="name" value={contactForm.contactName} onChange={(event) => setContactForm({ ...contactForm, contactName: event.target.value })} /></label>
                      <label>Telefone para contato<ContactInput required type="tel" inputMode="tel" autoComplete="tel" value={contactForm.contactPhone} onChange={(event) => setContactForm({ ...contactForm, contactPhone: formatPhone(event.target.value) })} /></label>
                      <label>E-mail para contato<ContactInput required type="email" maxLength="160" autoComplete="email" value={contactForm.contactEmail} onChange={(event) => setContactForm({ ...contactForm, contactEmail: event.target.value })} /></label>
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
                      <button type="button" disabled={Boolean(busy)} onClick={() => removeResponsible(viewer, branch)}>Excluir responsável</button>
                      {editingContact === viewer.id && <form id="responsible-contact-form" className={styles.contactForm} onSubmit={(event) => saveContact(event, viewer)}>
                        <label>Nome da pessoa responsável<input required minLength="2" maxLength="120" value={contactForm.contactName} onChange={(event) => setContactForm({ ...contactForm, contactName: event.target.value })} /></label>
                        <label>Telefone para contato<ContactInput required type="tel" inputMode="tel" value={contactForm.contactPhone} onChange={(event) => setContactForm({ ...contactForm, contactPhone: formatPhone(event.target.value) })} /></label>
                        <label>E-mail para contato<ContactInput required type="email" maxLength="160" value={contactForm.contactEmail} onChange={(event) => setContactForm({ ...contactForm, contactEmail: event.target.value })} /></label>
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
