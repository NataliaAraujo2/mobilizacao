import { Link } from "react-router-dom";
import styles from "./DashboardPage.module.css";

export default function MaintenancePage() {
  return <main className={styles.page}><section className={styles.card}><p>MobilizAÇÃO</p><h1>Lista de presença em manutenção</h1><p>Estamos aprimorando este recurso. A lista de presença ficará temporariamente indisponível.</p><p>Os registros existentes continuam preservados.</p><Link to="/">Voltar ao site</Link></section></main>;
}
