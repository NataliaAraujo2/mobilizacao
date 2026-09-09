import { Link } from "react-router-dom";
import logo2026 from "../assets/brand/mobilizacao-logo-colorido.webp";
import leaf from "../assets/brand/elements/elemento-01.webp";
import styles from "./CampaignGateway.module.css";

export default function Campaign2026Page() {
  return (
    <main className={`${styles.page} ${styles.soonPage}`}>
      <section className={styles.soonHero} aria-labelledby="campaign-2026-title">
        <img className={styles.soonLeaf} src={leaf} alt="" aria-hidden="true" />
        <p className={styles.eyebrow}>2ª edição</p>
        <h1 id="campaign-2026-title" className={styles.srOnly}>MobilizAÇÃO 2026</h1>
        <img className={styles.soonLogo} src={logo2026} alt="MobilizAÇÃO 2026 — Semeando e Cultivando o Futuro" width="1400" height="1466" />
        <h2>Em breve, maiores informações</h2>
        <p>Estamos preparando uma nova edição para mobilizar pessoas e cultivar transformação em todo o Brasil.</p>
        <Link className={styles.primaryButton} to="/">Voltar para as edições</Link>
      </section>
    </main>
  );
}
