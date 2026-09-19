import { formatPhone } from '../../functions/contactFields.js';
import ContactInput from '../components/ContactInput';
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { createBranchViewer, deleteBranchViewer, listBranchViewers, resetBranchViewerPassword, updateBranchViewer, updateBranchViewerContact } from "../services/branchViewersService";
import { listBranches } from "../services/branchesService";
import { whatsappUrl } from "../utils/whatsapp";
import { gmailComposeUrl } from "../utils/email";
import styles from "./BranchViewersPage.module.css";

const EMPTY_CONTACT = { branchId: "", contactName: "", contactEmail: "", contactPhone: "" };
const ERROR_MESSAGES = {
  "functions/not-found": "A coordenação estadual ou o acesso não foi encontrado.",
  "functions/permission-denied": "Você não tem permissão para gerenciar estes acessos.",
  "functions/already-exists": "Este e-mail já está cadastrado.",
};

export default function BranchViewersPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const responsibleDraft = useRef(location.state?.responsibleDraft).current;
  const [branches, setBranches] = useState([]);
  const [viewers, setViewers] = useState([]);
  const [credentials, setCredentials] = useState(null);
  const [credentialsCopied, setCredentialsCopied] = useState(false);
  const [contactForm, setContactForm] = useState(EMPTY_CONTACT);
  const [editingContact, setEditingContact] = useState("");
  const [pendingReset, setPendingReset] = useState("");
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([listBranches(), listBranchViewers()])
      .then(([branchList, viewerList]) => {
        setBranches(branchList.filter((branch) => branch.status === "active"));
        setViewers(viewerList);
      })
      .catch(() => setError("Não foi possível carregar os acessos e coordenações estaduais."))
      .finally(() => setLoading(false));
  }, []);

  const viewersByBranch = useMemo(() => viewers.reduce((map, viewer) => {
    const current = map.get(viewer.branchId) ?? [];
    current.push(viewer);
    map.set(viewer.branchId, current);
    return map;
  }, new Map()), [viewers]);

  useEffect(() => {
    if (loading || !responsibleDraft) return;
    const branch = branches.find((item) => item.id === responsibleDraft.branchId);
    if (!branch) setError("A coordenação estadual da resposta não está disponível.");
    else {
      setEditingContact(`new-${branch.id}`);
      setContactForm({ branchId: branch.id, contactName: responsibleDraft.contactName ?? "", contactEmail: responsibleDraft.contactEmail ?? "", contactPhone: responsibleDraft.contactPhone ?? "" });
      setMessage(`Dados carregados para ${branch.name}. Confirme para criar um acesso individual.`);
    }
    navigate(location.pathname, { replace: true, state: null });
  }, [loading, branches, responsibleDraft, location.pathname, navigate]);

  function beginAction(key) { setBusy(key); setError(""); setMessage(""); setCredentials(null); setCredentialsCopied(false); }
  function fail(actionError, fallback) { setError(ERROR_MESSAGES[actionError.code] ?? fallback); setBusy(""); }
  function cancelContactForm() { setEditingContact(""); setContactForm(EMPTY_CONTACT); }

  function startContactForm(branch, viewer = null) {
    setEditingContact(viewer?.id ?? `new-${branch.id}`);
    setContactForm(viewer ? { branchId: branch.id, contactName: viewer.contactName ?? "", contactEmail: viewer.contactEmail ?? "", contactPhone: formatPhone(viewer.contactPhone ?? "") } : { ...EMPTY_CONTACT, branchId: branch.id });
  }

  async function generateAccess(event, branch) {
    event.preventDefault();
    beginAction(`create-${branch.id}`);
    try {
      const input = { ...contactForm, branchId: branch.id, contactPhone: contactForm.contactPhone.replace(/\D/g, "") };
      const result = await createBranchViewer(input);
      setViewers((current) => [...current, { id: result.uid, displayName: result.username, coordinationNumber: result.coordinationNumber, userNumber: result.userNumber, ...input, role: "branchViewer", status: "active" }]);
      setCredentials({ ...result, branchName: branch.name, contactPhone: input.contactPhone, contactEmail: input.contactEmail, contactName: input.contactName }); setCredentialsCopied(false);
      cancelContactForm();
      setMessage("");
      setBusy("");
    } catch (actionError) { fail(actionError, "Não foi possível gerar o acesso."); }
  }

  async function saveContact(event, viewer) {
    event.preventDefault();
    beginAction(`contact-${viewer.id}`);
    try {
      const updated = await updateBranchViewerContact(viewer.id, { contactName: contactForm.contactName, contactEmail: contactForm.contactEmail, contactPhone: contactForm.contactPhone.replace(/\D/g, "") });
      setViewers((current) => current.map((item) => item.id === viewer.id ? { ...item, ...updated } : item));
      cancelContactForm(); setMessage("Dados da pessoa responsável atualizados."); setBusy("");
    } catch (actionError) { fail(actionError, "Não foi possível atualizar os dados de contato."); }
  }

  async function changeStatus(viewer) {
    beginAction(`status-${viewer.id}`);
    try {
      const status = viewer.status === "active" ? "blocked" : "active";
      await updateBranchViewer(viewer.id, status);
      setViewers((current) => current.map((item) => item.id === viewer.id ? { ...item, status } : item));
      setMessage(status === "active" ? "Acesso reativado." : "Acesso bloqueado."); setBusy("");
    } catch (actionError) { fail(actionError, "Não foi possível alterar o acesso."); }
  }

  async function resetPassword(viewer, branch) {
    beginAction(`reset-${viewer.id}`);
    try {
      const result = await resetBranchViewerPassword(viewer.id);
      setCredentials({ ...result, branchName: branch.name, contactPhone: viewer.contactPhone, contactEmail: viewer.contactEmail, contactName: viewer.contactName }); setCredentialsCopied(false);
      setPendingReset(""); setMessage("Nova senha criada. A senha anterior não funciona mais."); setBusy("");
    } catch (actionError) { fail(actionError, "Não foi possível gerar uma nova senha."); }
  }

  async function removeViewer(viewer, branch) {
    if (busy || !window.confirm(`Excluir o acesso de ${viewer.contactName || viewer.displayName} da coordenação ${branch.name}?`)) return;
    beginAction(`delete-${viewer.id}`);
    try {
      await deleteBranchViewer(viewer.id);
      setViewers((current) => current.filter((item) => item.id !== viewer.id));
      if (editingContact === viewer.id) cancelContactForm();
      setPendingReset(""); setMessage("Acesso individual excluído."); setBusy("");
    } catch (actionError) { fail(actionError, "Não foi possível excluir o acesso."); }
  }

  function credentialsMessage() {
    return `Olá, ${credentials?.contactName || 'Coordenação'}!\n\nNovidades na MobilizAÇÃO!\n\nAgora a Coordenação poderá acompanhar as inscrições dos voluntários e visualizar as informações do seu Estado.\n\nAcesse: ${window.location.origin}/login\n\nLogin: ${credentials?.username}\nSenha Inicial: ${credentials?.password} (alterar a senha no 1º acesso)`;
  }

  function shareCredentials() {
    if (!credentials) return;
    const url = whatsappUrl(credentials.contactPhone, credentialsMessage());
    if (!url) { setError("Cadastre o telefone da pessoa responsável antes de compartilhar."); return; }
    window.open(url, "_blank", "noopener,noreferrer");
  }

  function emailCredentials() {
    if (!credentials) return;
    const url = gmailComposeUrl(credentials.contactEmail, "Seu acesso à MobilizAÇÃO", credentialsMessage());
    if (!url) { setError("Cadastre o e-mail da pessoa responsável antes de compartilhar."); return; }
    window.open(url, "_blank", "noopener,noreferrer");
  }

  async function copyCredentials() {
    if (!credentials) return;
    try {
      await navigator.clipboard.writeText(`Usuário: ${credentials.username}\nSenha: ${credentials.password}`);
      setCredentialsCopied(true);
    } catch {
      setError("Não foi possível copiar os dados. Selecione e copie manualmente.");
    }
  }

  return <main className={styles.page}>
    <header className={styles.title}><div><p>Administração nacional</p><h1>Acessos das coordenações</h1><small>Gerencie usuários, senhas e contatos por estado.</small></div><span>{viewers.length} acesso{viewers.length === 1 ? "" : "s"}</span></header>
    {credentials && <div className={styles.modalBackdrop} role="presentation"><section className={styles.credentials} role="dialog" aria-modal="true"><p className={styles.credentialsEyebrow}>Acesso criado</p><h2>Guarde as credenciais agora</h2><div><span>Coordenação estadual</span><strong>{credentials.branchName}</strong></div><div><span>Usuário</span><strong>{credentials.username}</strong></div><div><span>Senha temporária</span><strong>{credentials.password}</strong></div><div className={styles.credentialsActions}><button type="button" onClick={copyCredentials}>Copiar usuário e senha</button><button type="button" onClick={shareCredentials}>Enviar pelo WhatsApp</button><button type="button" onClick={emailCredentials}>Enviar por e-mail</button></div>{credentialsCopied && <p className={styles.copied} role="status">Usuário e senha copiados.</p>}<p>Por segurança, a senha não fica salva para consulta.</p><button className={styles.closeCredentials} type="button" onClick={() => setCredentials(null)}>Fechar</button></section></div>}
    {error && <p className={styles.error} role="alert">{error}</p>}{message && <p className={styles.success} role="status">{message}</p>}
    <section className={styles.card}><h2>Coordenações estaduais</h2>{loading ? <p aria-busy="true">Carregando...</p> : branches.map((branch) => {
      const branchViewers = viewersByBranch.get(branch.id) ?? [];
      return <article className={styles.item} key={branch.id}><div className={styles.identity}><h3>{branch.name}</h3><p>{branch.state} · {branchViewers.length} usuário{branchViewers.length === 1 ? "" : "s"}</p></div>
        <button type="button" disabled={Boolean(busy)} onClick={() => startContactForm(branch)}>Cadastrar usuário</button>
        {editingContact === `new-${branch.id}` && <form className={styles.contactForm} onSubmit={(event) => generateAccess(event, branch)}><label>Nome da pessoa responsável<input required minLength="2" value={contactForm.contactName} onChange={(event) => setContactForm({ ...contactForm, contactName: event.target.value })} /></label><label>Telefone para contato<ContactInput required type="tel" value={contactForm.contactPhone} onChange={(event) => setContactForm({ ...contactForm, contactPhone: formatPhone(event.target.value) })} /></label><label>E-mail para contato<ContactInput required type="email" value={contactForm.contactEmail} onChange={(event) => setContactForm({ ...contactForm, contactEmail: event.target.value })} /></label><div><button type="submit" disabled={Boolean(busy)}>{busy === `create-${branch.id}` ? "Gerando..." : "Gerar acesso"}</button><button type="button" onClick={cancelContactForm}>Cancelar</button></div></form>}
        <div className={styles.viewerList}>{branchViewers.map((viewer) => <section className={styles.viewer} key={viewer.id}><div><strong>{viewer.contactName || "Pessoa responsável"}</strong><p>{viewer.displayName}</p><small>{formatPhone(viewer.contactPhone) || "Sem telefone"} · {viewer.contactEmail || "Sem e-mail"}</small></div><span className={viewer.status === "active" ? styles.active : styles.blocked}>{viewer.status === "active" ? "Ativo" : "Bloqueado"}</span><button type="button" disabled={Boolean(busy)} onClick={() => changeStatus(viewer)}>{viewer.status === "active" ? "Bloquear" : "Reativar"}</button><button className={styles.secondary} type="button" disabled={Boolean(busy)} onClick={() => setPendingReset(viewer.id)}>Nova senha</button><button className={styles.secondary} type="button" disabled={Boolean(busy)} onClick={() => startContactForm(branch, viewer)}>Editar</button><button type="button" disabled={Boolean(busy)} onClick={() => removeViewer(viewer, branch)}>Excluir</button>{pendingReset === viewer.id && <div className={styles.confirm}><button type="button" disabled={Boolean(busy)} onClick={() => resetPassword(viewer, branch)}>Confirmar nova senha</button><button type="button" onClick={() => setPendingReset("")}>Cancelar</button></div>}{editingContact === viewer.id && <form className={styles.contactForm} onSubmit={(event) => saveContact(event, viewer)}><label>Nome da pessoa responsável<input required minLength="2" value={contactForm.contactName} onChange={(event) => setContactForm({ ...contactForm, contactName: event.target.value })} /></label><label>Telefone para contato<ContactInput required type="tel" value={contactForm.contactPhone} onChange={(event) => setContactForm({ ...contactForm, contactPhone: formatPhone(event.target.value) })} /></label><label>E-mail para contato<ContactInput required type="email" value={contactForm.contactEmail} onChange={(event) => setContactForm({ ...contactForm, contactEmail: event.target.value })} /></label><div><button type="submit" disabled={Boolean(busy)}>Salvar</button><button type="button" onClick={cancelContactForm}>Cancelar</button></div></form>}</section>)}</div>
      </article>;
    })}</section>
  </main>;
}
