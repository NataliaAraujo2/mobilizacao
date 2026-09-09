import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import BrazilMap from "../components/BrazilMap/BrazilMap";
import logo2025 from "../assets/brand/mobilizacao-logo-2025.webp";
import { getPublicReport, getPublicReportUrl } from "../services/reportsService";
import styles from "./Campaign2025Page.module.css";

function formatFileSize(size = 0) {
  return size ? `${(size / 1024 / 1024).toFixed(1).replace(".", ",")} MB` : "PDF";
}

const odsIndicators = [
  [1, "Erradicação da pobreza", 1800, "#e5243b"], [2, "Fome zero", 2900, "#dda63a"],
  [3, "Saúde e bem-estar", 1600, "#4c9f38"], [4, "Educação de qualidade", 9000, "#c5192d"],
  [5, "Igualdade de gênero", 10800, "#ff3a21"], [6, "Água potável", 9800, "#26bde2"],
  [8, "Trabalho decente", 3900, "#a21942"], [10, "Redução das desigualdades", 10800, "#dd1367"],
  [11, "Cidades sustentáveis", 7900, "#fd9d24"], [12, "Consumo responsável", 6900, "#bf8b2e"],
  [13, "Ação climática", 10800, "#3f7e44"], [14, "Vida na água", 5000, "#0a97d9"],
  [15, "Vida terrestre", 3000, "#56c02b"], [16, "Paz e justiça", 10800, "#00689d"],
  [17, "Parcerias", 10800, "#19486a"], [18, "Indicador complementar", 1900, "#a44a1c"],
];

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
        </div>
        <div className={styles.brandPanel}>
          <img src={logo2025} alt="MobilizAÇÃO 2025" />
        </div>
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

      <section className={`${styles.section} ${styles.odsSection}`} aria-labelledby="ods-title">
        <div className={styles.sectionHeading}><p className={styles.eyebrow}>Agenda 2030</p><h2 id="ods-title">MobilizAÇÃO em sintonia com os ODS</h2><p>As ações da campanha contribuíram para diferentes Objetivos de Desenvolvimento Sustentável. O gráfico apresenta os indicadores registrados no relatório de 2025.</p></div>
        <div className={styles.odsChart} role="img" aria-label="Gráfico de indicadores ODS da campanha MobilizAÇÃO 2025">
          {odsIndicators.map(([number, label, value, color]) => <div className={styles.odsRow} key={number}><span className={styles.odsLabel}>ODS {String(number).padStart(2, "0")}</span><div className={styles.odsTrack}><span className={styles.odsBar} style={{ width: `${(value / 11000) * 100}%`, backgroundColor: color }} /><span className={styles.odsName}>{label}</span></div><strong className={styles.odsValue}>{value.toLocaleString("pt-BR")}</strong></div>)}
        </div>
        <div className={styles.odsLegend} aria-label="Legenda dos ODS">
          {odsIndicators.map(([number, label, , color]) => <span className={styles.odsLegendItem} key={`legend-${number}`}><b style={{ backgroundColor: color }}>ODS {String(number).padStart(2, "0")}</b>{label}</span>)}
        </div>
        <p className={styles.odsNote}>Indicadores de beneficiários diretos, conforme o relatório da campanha.</p>
      </section>

      <section className={styles.section} id="relatorio" aria-labelledby="report-title">
        <div className={styles.reportCard}>
          <span className={styles.reportIcon} aria-hidden="true">PDF</span>
          <div className={styles.reportContent}><p className={styles.reportEyebrow}>{reportUrl ? "Arquivo disponível" : "Arquivo em preparação"}</p><h2 id="report-title">Relatório completo da MobilizAÇÃO 2025</h2><p>Versão para leitura, compartilhamento e impressão, com resultados, fotos e relatos da campanha.</p>{reportUrl && <span className={styles.reportMeta}>PDF comprimido · {formatFileSize(report.size)}</span>}</div>
          {reportUrl ? <div className={styles.reportActions}><Link className={styles.primaryButton} to="/2025/relatorio" target="_blank" rel="noreferrer">Ler relatório completo</Link><a className={styles.secondaryButton} href={reportUrl} download>Baixar PDF</a></div> : <p className={styles.unavailable}>O PDF completo será disponibilizado aqui.</p>}
        </div>
      </section>
    </main>
  );
}
