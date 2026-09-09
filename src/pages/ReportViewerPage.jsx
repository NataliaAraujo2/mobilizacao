import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getPublicReport, getPublicReportUrl } from "../services/reportsService";
import styles from "./ReportViewerPage.module.css";

function formatFileSize(size = 0) {
  return size ? `${(size / 1024 / 1024).toFixed(1).replace(".", ",")} MB` : "PDF";
}

export default function ReportViewerPage() {
  const [report, setReport] = useState(null);
  const [reportUrl, setReportUrl] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    getPublicReport()
      .then(async (currentReport) => {
        if (!currentReport) return null;
        const url = await getPublicReportUrl(currentReport);
        return { currentReport, url };
      })
      .then((result) => {
        if (!active || !result) return;
        setReport(result.currentReport);
        setReportUrl(result.url);
      })
      .catch(() => { if (active) setError("Não foi possível abrir o relatório neste momento."); });
    return () => { active = false; };
  }, []);

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div><p>MobilizAÇÃO 2025</p><h1>Relatório completo</h1><span>{report ? `PDF · ${formatFileSize(report.size)}` : "Preparando documento..."}</span></div>
        <div className={styles.actions}>
          <Link to="/2025">Voltar ao resumo</Link>
          {reportUrl && <a href={reportUrl} download>Baixar PDF</a>}
          {reportUrl && <a href={reportUrl} target="_blank" rel="noreferrer">Abrir em tela cheia ↗</a>}
        </div>
      </header>
      {error && <p className={styles.error} role="alert">{error}</p>}
      {!error && !reportUrl && <p className={styles.loading} aria-busy="true">Carregando o relatório...</p>}
      {reportUrl && <iframe className={styles.viewer} title="Relatório completo da MobilizAÇÃO 2025" src={`${reportUrl}#toolbar=1&navpanes=0`} />}
    </main>
  );
}
