import ContactInput from '../components/ContactInput';
import { useEffect, useState } from "react";
import { useAuth } from "../auth/useAuth";
import { createSuperAdmin, deleteSuperAdmin, listSuperAdmins, resetSuperAdminPassword, syncSuperAdminClaims, updateSuperAdmin } from "../services/branchViewersService";
import { whatsappUrl } from "../utils/whatsapp";
import { gmailComposeUrl } from "../utils/email";
import styles from "./SuperAdminsPage.module.css";

export default function SuperAdminsPage() {
  const { user } = useAuth();
  const [form, setForm] = useState({ displayName: "", email: "", phone: "" });
  const [credentials, setCredentials] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [admins, setAdmins] = useState([]);
  const [loadingAdmins, setLoadingAdmins] = useState(true);
  const [listError, setListError] = useState("");
  const [syncMessage, setSyncMessage] = useState("");
  const [editing, setEditing] = useState(null);

  async function loadAdmins() {
    setLoadingAdmins(true);
    setListError("");
    try { setAdmins(await listSuperAdmins()); }
    catch { setListError("Não foi possível carregar os superadmins."); }
    finally { setLoadingAdmins(false); }
  }

  useEffect(() => { loadAdmins(); }, []);
  async function submit(event) {
    event.preventDefault(); setBusy(true); setError(""); setCredentials(null);
    try {
      const result = await createSuperAdmin(form);
      setCredentials({ ...result, phone: form.phone, displayName: form.displayName });
      setForm({ displayName: "", email: "", phone: "" });
      await loadAdmins();
    }
    catch (err) { setError(err.code === "functions/already-exists" ? "Este e-mail já possui uma conta." : "Não foi possível criar o superAdmin."); }
    finally { setBusy(false); }
  }
  async function removeAdmin(admin) {
    if (busy || admin.id === user?.uid || !window.confirm(`Excluir permanentemente o acesso de ${admin.displayName}? Essa pessoa não poderá mais entrar no sistema.`)) return;
    setBusy(true); setListError("");
    try {
      await deleteSuperAdmin(admin.id);
      setAdmins(current => current.filter(item => item.id !== admin.id));
    } catch (err) {
      setListError(err.code === "functions/failed-precondition" ? "Você não pode excluir o próprio acesso." : "Não foi possível excluir o superadmin. Tente novamente.");
    } finally { setBusy(false); }
  }
  async function saveAdmin(event) {
    event.preventDefault();
    if (!editing || busy) return;
    setBusy(true); setListError('');
    try {
      const updated = await updateSuperAdmin(editing.id, editing);
      setAdmins(current => current.map(item => item.id === updated.uid ? { ...item, ...updated } : item));
      setEditing(null);
    } catch (err) {
      setListError(err.code === 'functions/already-exists' ? 'Este e-mail já possui uma conta.' : err.message || 'Não foi possível atualizar o superadmin.');
    } finally { setBusy(false); }
  }
  async function resetPassword(admin) {
    if (busy || !window.confirm(`Gerar uma nova senha temporária para ${admin.displayName}? A pessoa precisará definir outra senha ao entrar.`)) return;
    setBusy(true); setListError(''); setCredentials(null);
    try {
      const result = await resetSuperAdminPassword(admin.id);
      setCredentials({ ...result, heading: 'Nova senha gerada' });
    } catch (err) { setListError(err.message || 'Não foi possível gerar uma nova senha.'); }
    finally { setBusy(false); }
  }
  async function syncPermissions() {
    if (busy) return;
    setBusy(true); setListError(''); setSyncMessage('');
    try {
      const result = await syncSuperAdminClaims();
      const missing = result.missingAuthUsers?.length ?? 0;
      setSyncMessage(missing ? `${result.synced.length} permissão(ões) sincronizada(s). ${missing} conta(s) não possuem acesso no Firebase Auth.` : `${result.synced.length} superadmin(s) sincronizado(s) com sucesso.`);
    } catch (err) {
      setListError(err.message || 'Não foi possível sincronizar as permissões.');
    } finally { setBusy(false); }
  }
  const shareUrl = credentials && whatsappUrl(credentials.phone, `Olá, ${credentials.displayName}!\n\nSeu acesso à MobilizAÇÃO foi criado.\nUsuário: ${credentials.email}\nSenha temporária: ${credentials.password}\n\nAcesse: ${window.location.origin}/login\n\nNo primeiro acesso, defina sua senha pessoal.`);
  const emailUrl = credentials && gmailComposeUrl(credentials.email, "Seu acesso à MobilizAÇÃO", `Olá, ${credentials.displayName}!\n\nSeu acesso à MobilizAÇÃO foi criado.\n\nUsuário: ${credentials.email}\nSenha temporária: ${credentials.password}\n\nAcesse: ${window.location.origin}/login\n\nNo primeiro acesso, defina sua senha pessoal.`);
  return <main className={styles.page}><section className={styles.card}><p className={styles.eyebrow}>Acesso restrito</p><h1>Novo superAdmin</h1><p>Somente um superAdmin ativo pode criar outro administrador nacional.</p><form onSubmit={submit}><label>Nome completo<input required minLength="2" value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} /></label><label>E-mail de acesso<ContactInput required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label><label>Telefone para compartilhar por WhatsApp <small>(opcional e não será salvo)</small><ContactInput type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></label>{error && <p role="alert" className={styles.error}>{error}</p>}<button disabled={busy}>{busy ? "Criando..." : "Criar superAdmin"}</button></form>{credentials && <aside className={styles.credentials}><strong>{credentials.heading || 'Acesso criado'}</strong><span>E-mail: {credentials.email}</span><span>Senha temporária: <b>{credentials.password}</b></span><div className={styles.shareActions}>{shareUrl && <a className={styles.whatsapp} href={shareUrl} target="_blank" rel="noreferrer">Enviar por WhatsApp</a>}{emailUrl && <a className={styles.email} href={emailUrl} target="_blank" rel="noreferrer">Enviar por e-mail</a>}</div><small>Copie a senha agora. Ela não será exibida novamente.</small></aside>}</section><section className={styles.listCard} aria-labelledby="superadmins-title"><div><p className={styles.eyebrow}>Acessos ativos</p><h2 id="superadmins-title">Superadmins cadastrados</h2></div><div className={styles.syncArea}><p>Confirme e atualize as permissões de acesso no Firebase Auth.</p><button type="button" onClick={syncPermissions} disabled={busy}>{busy ? 'Sincronizando...' : 'Sincronizar permissões'}</button></div>{syncMessage && <p className={styles.success} role="status">{syncMessage}</p>}{loadingAdmins ? <p aria-busy="true">Carregando...</p> : listError ? <p className={styles.error}>{listError} <button type="button" onClick={loadAdmins}>Tentar novamente</button></p> : admins.length === 0 ? <p>Nenhum superadmin cadastrado.</p> : <ul>{admins.map((admin) => <li key={admin.id}><strong>{admin.displayName}</strong><span>{admin.email}</span><small>{admin.status === "active" ? "Ativo" : "Bloqueado"}</small>{editing?.id === admin.id ? <form className={styles.editForm} onSubmit={saveAdmin}><label>Nome<input required minLength="2" value={editing.displayName} onChange={event => setEditing({ ...editing, displayName: event.target.value })} /></label><label>E-mail<ContactInput required type="email" value={editing.email} onChange={event => setEditing({ ...editing, email: event.target.value })} /></label><div><button type="submit" disabled={busy}>Salvar</button><button type="button" disabled={busy} onClick={() => setEditing(null)}>Cancelar</button></div></form> : <div className={styles.adminActions}><button type="button" disabled={busy} onClick={() => setEditing({ id: admin.id, displayName: admin.displayName, email: admin.email })}>Editar</button><button type="button" disabled={busy} onClick={() => resetPassword(admin)}>Gerar nova senha</button>{admin.id !== user?.uid && <button className={styles.deleteButton} type="button" disabled={busy} onClick={() => removeAdmin(admin)}>Excluir superadmin</button>}</div>}</li>)}</ul>}</section></main>;
}
