import { useEffect, useState } from "react";
import { useAuth } from "../auth/useAuth";
import { getNewAssociatesCount, updateNewAssociatesCount } from "../services/associationStatsService";
import styles from "./AssociatesCounterPage.module.css";

export default function AssociatesCounterPage() {
  const { user } = useAuth();
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    getNewAssociatesCount()
      .then(setCount)
      .catch(() => setError("Não foi possível carregar o contador."))
      .finally(() => setLoading(false));
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const saved = await updateNewAssociatesCount(count, user.uid);
      setCount(saved);
      setMessage("Contador público atualizado com sucesso.");
    } catch (saveError) {
      setError(saveError.message || "Não foi possível atualizar o contador.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className={styles.page}>
      <header className={styles.title}>
        <div><p>Administração nacional</p><h1>Novos associados</h1></div>
      </header>

      <section className={styles.card} aria-labelledby="counter-title">
        <div className={styles.preview}>
          <small>Já somos</small>
          <strong>{loading ? "—" : Number(count).toLocaleString("pt-BR")}</strong>
          <span>novos associados</span>
        </div>
        <div className={styles.formArea}>
          <p className={styles.eyebrow}>Contador da pré-home</p>
          <h2 id="counter-title">Atualizar quantidade</h2>
          <p>Informe o total acumulado de novos associados. A pré-home exibirá esse mesmo número.</p>
          <form onSubmit={handleSubmit}>
            <label htmlFor="associates-count">Quantidade de novos associados</label>
            <input id="associates-count" type="number" min="0" max="99999999" step="1" required disabled={loading || saving} value={count} onChange={(event) => setCount(event.target.value)} />
            <button type="submit" disabled={loading || saving}>{saving ? "Atualizando..." : "Atualizar contador"}</button>
          </form>
          {message && <p className={styles.success} role="status">{message}</p>}
          {error && <p className={styles.error} role="alert">{error}</p>}
          <small className={styles.costNote}>O Firebase só será atualizado quando este botão for acionado.</small>
        </div>
      </section>
    </main>
  );
}
