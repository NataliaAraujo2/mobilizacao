import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../auth/useAuth";
import { getBranch } from "../services/branchesService";
import { listVolunteerPrivate, listVolunteers } from "../services/volunteersService";
import styles from "./ConsultationPage.module.css";

export default function ConsultationPage() {
  const { user, claims } = useAuth();
  const [branch, setBranch] = useState(null);
  const [volunteers, setVolunteers] = useState([]);
  const [documents, setDocuments] = useState({});
  const [loading, setLoading] = useState(true);
  const [preparing, setPreparing] = useState(false);
  const [printReady, setPrintReady] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([getBranch(claims.branchId), listVolunteers(claims.branchId)])
      .then(([branchData, volunteerList]) => {
        setBranch(branchData);
        setVolunteers(volunteerList.filter((volunteer) => volunteer.status === "active"));
      })
      .catch(() => setError("Não foi possível carregar a listagem da filial."))
      .finally(() => setLoading(false));
  }, [claims.branchId]);

  const completeList = useMemo(() => volunteers.map((volunteer) => ({
    ...volunteer,
    documents: documents[volunteer.id],
  })), [documents, volunteers]);

  async function preparePrint() {
    setPreparing(true);
    setError("");
    try {
      const privateList = await listVolunteerPrivate(claims.branchId);
      setDocuments(Object.fromEntries(privateList.map((item) => [item.id, item])));
      setPrintReady(true);
    } catch {
      setError("Não foi possível preparar os documentos para impressão.");
    } finally {
      setPreparing(false);
    }
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div><p>Consulta da filial</p><h1>{branch?.name ?? "Minha filial"}</h1><span>Usuário: {user.displayName ?? user.email}</span></div>
        <span className={styles.readOnly}>Somente consulta</span>
      </header>

      <section className={styles.actions} aria-labelledby="list-title">
        <div><h2 id="list-title">Listagem de voluntários</h2><p>{volunteers.length} voluntário{volunteers.length === 1 ? "" : "s"} ativo{volunteers.length === 1 ? "" : "s"}</p></div>
        {!printReady ? <button type="button" disabled={preparing || loading || volunteers.length === 0} onClick={preparePrint}>{preparing ? "Preparando..." : "Preparar para imprimir"}</button> : <button type="button" onClick={() => window.print()}>Imprimir listagem</button>}
      </section>

      <p className={styles.safety}>Os documentos completos só são carregados quando você prepara a impressão. Não compartilhe esta listagem fora da ação.</p>
      {error && <p className={styles.error} role="alert">{error}</p>}

      <section className={styles.list} aria-live="polite">
        {loading ? <p aria-busy="true">Carregando...</p> : volunteers.length === 0 ? <p className={styles.empty}>Nenhum voluntário ativo nesta filial.</p> : completeList.map((volunteer, index) => (
          <article className={styles.volunteer} key={volunteer.id}>
            <span className={styles.number}>{index + 1}</span>
            <div className={styles.name}><span>Nome</span><strong>{volunteer.fullName}</strong></div>
            <div><span>CPF</span><strong>{volunteer.documents?.cpf ?? "Disponível para impressão"}</strong></div>
            <div><span>RG</span><strong>{volunteer.documents?.rg ?? "Protegido"}</strong></div>
            <div><span>Nascimento</span><strong>{volunteer.documents?.birthDate ? volunteer.documents.birthDate.split("-").reverse().join("/") : "Protegido"}</strong></div>
          </article>
        ))}
      </section>
    </main>
  );
}
