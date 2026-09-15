import ContactInput from '../components/ContactInput';
import { useEffect, useState } from "react";
import { createSuperAdmin, listSuperAdmins } from "../services/branchViewersService";
import { whatsappUrl } from "../utils/whatsapp";
import styles from "./SuperAdminsPage.module.css";

export default function SuperAdminsPage() {
  const [form, setForm] = useState({ displayName: "", email: "", phone: "" });
  const [credentials, setCredentials] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [admins, setAdmins] = useState([]);
  const [loadingAdmins, setLoadingAdmins] = useState(true);
  const [listError, setListError] = useState("");

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
  const shareUrl = credentials && whatsappUrl(credentials.phone, `Olá, ${credentials.displayName}!\n\nSeu acesso à MobilizAÇÃO foi criado.\nUsuário: ${credentials.email}\nSenha temporária: ${credentials.password}\n\nAcesse: ${window.location.origin}/login\n\nNo primeiro acesso, defina sua senha pessoal.`);
  return <main className={styles.page}><section className={styles.card}><p className={styles.eyebrow}>Acesso restrito</p><h1>Novo superAdmin</h1><p>Somente um superAdmin ativo pode criar outro administrador nacional.</p><form onSubmit={submit}><label>Nome completo<input required minLength="2" value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} /></label><label>E-mail de acesso<ContactInput required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label><label>Telefone para compartilhar por WhatsApp <small>(opcional e não será salvo)</small><ContactInput type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></label>{error && <p role="alert" className={styles.error}>{error}</p>}<button disabled={busy}>{busy ? "Criando..." : "Criar superAdmin"}</button></form>{credentials && <aside className={styles.credentials}><strong>Acesso criado</strong><span>E-mail: {credentials.email}</span><span>Senha temporária: <b>{credentials.password}</b></span>{shareUrl && <a className={styles.whatsapp} href={shareUrl} target="_blank" rel="noreferrer">Enviar acesso por WhatsApp</a>}<small>Copie a senha agora. Ela não será exibida novamente.</small></aside>}</section><section className={styles.listCard} aria-labelledby="superadmins-title"><div><p className={styles.eyebrow}>Acessos ativos</p><h2 id="superadmins-title">Superadmins cadastrados</h2></div>{loadingAdmins ? <p aria-busy="true">Carregando...</p> : listError ? <p className={styles.error}>{listError} <button type="button" onClick={loadAdmins}>Tentar novamente</button></p> : admins.length === 0 ? <p>Nenhum superadmin cadastrado.</p> : <ul>{admins.map((admin) => <li key={admin.id}><strong>{admin.displayName}</strong><span>{admin.email}</span><small>{admin.status === "active" ? "Ativo" : "Bloqueado"}</small></li>)}</ul>}</section></main>;
}
