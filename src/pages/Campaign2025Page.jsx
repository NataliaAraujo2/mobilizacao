import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import BrazilMap from "../components/BrazilMap/BrazilMap";
import logo2025 from "../assets/brand/mobilizacao-logo-2025.webp";
import { getPublicReport, getPublicReportUrl } from "../services/reportsService";
import styles from "./Campaign2025Page.module.css";

function formatFileSize(size = 0) {
  return size ? `${(size / 1024 / 1024).toFixed(1).replace(".", ",")} MB` : "PDF";
}

export default function Campaign2025Page() {
  const [report, setReport] = useState(null);
  const [reportUrl, setReportUrl] = useState("");

  useEffect(() => {
    let active = true;
    getPublicReport()
      .then(async (currentReport) => {
        if (!currentReport) return null;
        return { currentReport, url: await getPublicReportUrl(currentReport) };
      })
      .then((result) => {
        if (!active || !result) return;
        setReport(result.currentReport);
        setReportUrl(result.url);
      })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  return (
    <main className={styles.page}>
      <section className={styles.hero} aria-labelledby="campaign-2025-title">
        <div>
          <p className={styles.eyebrow}>Edição 2025</p>
          <h1 id="campaign-2025-title">MobilizAÇÃO 2025</h1>
          <p>Uma mobilização nacional que transformou o voluntariado em ações socioambientais concretas, conectando pessoas, comunidades e territórios em todo o Brasil.</p>
          <div className={styles.actions}>
            <a className={styles.primaryButton} href="#relatorio">Ler o relatório</a>
            <Link className={styles.secondaryButton} to="/">Ver todas as edições</Link>
          </div>
        </div>
        <img src={logo2025} alt="MobilizAÇÃO 2025" width="900" height="900" />
      </section>

      <section className={styles.section} aria-labelledby="numbers-title">
        <div className={styles.sectionHeading}><p className={styles.eyebrow}>Impacto nacional</p><h2 id="numbers-title">Grandes números da mobilização</h2></div>
        <div className={styles.numbers}>
          {[['1.417', 'voluntários mobilizados'], ['11.136', 'beneficiários diretos'], ['33.408', 'beneficiários indiretos'], ['11.136', 'mudas plantadas'], ['4,3 t', 'resíduos recolhidos'], ['27', 'espaços revitalizados']].map(([value, label]) => <article className={styles.number} key={label}><strong>{value}</strong><span>{label}</span></article>)}
        </div>
      </section>

      <section className={`${styles.section} ${styles.impact}`} aria-labelledby="territory-title">
        <div className={styles.map}><BrazilMap disabled /></div>
        <div className={styles.impactText}>
          <p className={styles.eyebrow}>Presença e propósito</p>
          <h2 id="territory-title">Impacto que alcançou o Brasil</h2>
          <p>A campanha reuniu ações de revitalização de espaços públicos, plantio de árvores, hortas comunitárias, educação ambiental e cuidado com os territórios.</p>
          <ul className={styles.pillList}><li>23 estados participantes</li><li>29 municípios</li><li>Agenda 2030</li><li>Legado da COP30</li></ul>
        </div>
      </section>

      <section className={styles.section} id="relatorio" aria-labelledby="report-title">
        <div className={styles.reportCard}>
          <span className={styles.reportIcon} aria-hidden="true">PDF</span>
          <div><h2 id="report-title">Relatório completo da MobilizAÇÃO 2025</h2><p>Veja os relatos, fotos, resultados por estado, metodologia, governança e aprendizados da campanha.</p></div>
          {reportUrl ? <div className={styles.reportActions}><Link className={styles.primaryButton} to="/2025/relatorio" target="_blank" rel="noreferrer">Ver relatório completo (PDF · {formatFileSize(report.size)})</Link><a className={styles.secondaryButton} href={reportUrl} download>Baixar PDF</a></div> : <p className={styles.unavailable}>O relatório digital será disponibilizado em breve.</p>}
        </div>
      </section>
    </main>
  );
}
