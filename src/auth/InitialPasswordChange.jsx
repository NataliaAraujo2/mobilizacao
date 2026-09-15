import { useState } from "react";
import { useAuth } from "./useAuth";
import { completeInitialPasswordChange } from "../services/branchViewersService";
import styles from "./InitialPasswordChange.module.css";

export default function InitialPasswordChange() {
  const { refreshClaims } = useAuth();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setError("");
    if (password.length < 6) return setError("A senha precisa ter pelo menos 6 caracteres.");
    if (password !== confirmation) return setError("As senhas não coincidem.");
    setSaving(true);
    try {
      await completeInitialPasswordChange(password);
      await refreshClaims();
    } catch (changeError) {
      setError(changeError.message || "Não foi possível alterar a senha. Tente novamente.");
    } finally {
      setSaving(false);
    }
  }

  return <main className={styles.page}><section className={styles.card} aria-labelledby="password-title"><p className={styles.eyebrow}>Primeiro acesso</p><h1 id="password-title">Defina sua senha</h1><p>Por segurança, substitua a senha temporária antes de continuar.</p><form onSubmit={submit}><label>Nova senha<input type="password" minLength="6" autoComplete="new-password" required value={password} onChange={event => setPassword(event.target.value)} /></label><label>Confirme a nova senha<input type="password" minLength="6" autoComplete="new-password" required value={confirmation} onChange={event => setConfirmation(event.target.value)} /></label>{error && <p className={styles.error} role="alert">{error}</p>}<button type="submit" disabled={saving}>{saving ? "Salvando..." : "Salvar nova senha"}</button></form></section></main>;
}
