import { Link } from "react-router-dom";
import leavesElement from "../assets/brand/elements/elemento-01.webp";
import impactElement from "../assets/brand/elements/elemento-02.webp";
import styles from "./CampaignGateway.module.css";

export default function Agenda2030Page() {
  return (
    <main className={`${styles.page} ${styles.campaignPage}`}>
      <header className={styles.campaignHeader}>
        <p className={styles.eyebrow}>Agenda 2030</p>
        <h1>Um futuro mais justo,<br />solidário e sustentável</h1>
        <p>A MobilizAÇÃO conecta pessoas e iniciativas que ajudam a transformar comunidades em todo o Brasil.</p>
      </header>

      <section className={styles.agendaCard} aria-labelledby="agenda-action-title">
        <img src={impactElement} alt="" aria-hidden="true" />
        <div>
          <p className={styles.eyebrow}>Nossa contribuição</p>
          <h2 id="agenda-action-title">Cada ação faz parte de uma mudança maior.</h2>
          <p>Em breve, esta página reunirá as metas, os objetivos e os impactos da MobilizAÇÃO em sintonia com a Agenda 2030.</p>
          <Link className={styles.primaryButton} to="/2026"><img src={leavesElement} alt="" aria-hidden="true" />Conheça as ações de 2026</Link>
        </div>
      </section>
    </main>
  );
}
