import { useState } from "react";
import { Link } from "react-router-dom";
import { createSuperAdmin } from "../services/branchViewersService";
import styles from "./SuperAdminsPage.module.css";

export default function SuperAdminsPage() {
  const [form, setForm] = useState({ displayName: "", email: "" });
  const [credentials, setCredentials] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event) {
    event.preventDefault(); setBusy(true); setError(""); setCredentials(null);
    try { setCredentials(await createSuperAdmin(form)); setForm({ displayName: "", email: "" }); }
    catch (err) { setError(err.code === "functions/already-exists" ? "Este e-mail já possui uma conta." : "Não foi possível criar o superAdmin."); }
    finally { setBusy(false); }
  }
  return <main className={styles.page}><section className={styles.card}><Link to="/admin">← Voltar para minha área</Link><p className={styles.eyebrow}>Acesso restrito</p><h1>Novo superAdmin</h1><p>Somente um superAdmin ativo pode criar outro administrador nacional.</p><form onSubmit={submit}><label>Nome completo<input required minLength="2" value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} /></label><label>E-mail de acesso<input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label>{error && <p role="alert" className={styles.error}>{error}</p>}<button disabled={busy}>{busy ? "Criando..." : "Criar superAdmin"}</button></form>{credentials && <aside className={styles.credentials}><strong>Acesso criado</strong><span>E-mail: {credentials.email}</span><span>Senha temporária: <b>{credentials.password}</b></span><small>Copie a senha agora. Ela não será exibida novamente.</small></aside>}</section></main>;
}
