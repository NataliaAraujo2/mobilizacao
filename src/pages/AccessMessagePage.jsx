import { Link } from "react-router-dom";
import styles from "./DashboardPage.module.css";

export default function AccessMessagePage({ blocked = false }) {
  return (
    <main className={styles.page}>
      <section className={styles.card}>
        <h1>{blocked ? "Acesso indisponível" : "Sem permissão"}</h1>
        <p>{blocked ? "Esta conta ainda não está ativa ou foi bloqueada." : "Seu perfil não permite acessar esta área."}</p>
        <Link to="/">Voltar ao site</Link>
      </section>
    </main>
  );
}
