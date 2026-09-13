import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { finalizePublicReport2025, getPublicReport, getPublicReportUrl, MAX_REPORT_SIZE, publishReport2025 } from "../services/reportsService";
import styles from "./ReportsAdminPage.module.css";

function formatFileSize(size = 0) {
  return `${(size / 1024 / 1024).toFixed(1).replace(".", ",")} MB`;
}

export default function ReportsAdminPage() {
  const [report, setReport] = useState(null);
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => { getPublicReport().then(setReport).catch(() => setError("Não foi possível consultar o relatório arquivado.")); }, []);

  function selectFile(event) {
    const selected = event.target.files?.[0] ?? null;
    setError("");
    setMessage("");
    if (!selected) return setFile(null);
    if (selected.type !== "application/pdf") return setError("Selecione um arquivo PDF.");
    if (selected.size > MAX_REPORT_SIZE) return setError("O PDF deve ter no máximo 25 MB. Comprima o arquivo antes de enviar.");
    setFile(selected);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!file) return setError("Selecione o PDF comprimido antes de publicar.");
    setUploading(true);
    setProgress(0);
    setError("");
    setMessage("");
    try {
      await publishReport2025(file, (sent, total) => setProgress(total ? Math.round((sent / total) * 100) : 0));
      const currentReport = await getPublicReport();
      setReport(currentReport);
      setFile(null);
      setMessage("Relatório publicado. A página pública já usará esta versão.");
    } catch (uploadError) {
      setError(uploadError.message || "Não foi possível publicar o relatório.");
    } finally {
      setUploading(false);
    }
  }

  async function finalizeExistingFile() {
    setUploading(true);
    setError("");
    setMessage("");
    try {
      await finalizePublicReport2025();
      const currentReport = await getPublicReport();
      setReport(currentReport);
      setMessage("Arquivo encontrado e relatório publicado. A página pública já usará esta versão.");
    } catch (publishError) {
      setError(publishError.message || "Não foi possível concluir a publicação do arquivo.");
    } finally {
      setUploading(false);
    }
  }

  async function openReport() {
    if (!report) return;
    try { window.open(await getPublicReportUrl(report), "_blank", "noopener,noreferrer"); } catch { setError("Não foi possível abrir o PDF arquivado."); }
  }

  return (
    <main className={styles.page}>
      <header className={styles.title}><div><p>Administração nacional</p><h1>Relatório da edição 2025</h1></div><Link to="/admin">Voltar para minha área</Link></header>
      <section className={styles.card}>
        <h2>Arquivo público para leitura e impressão</h2>
        <p>Envie somente o PDF já comprimido. Ele será exibido apenas quando uma pessoa abrir o relatório completo; a página <strong>/2025</strong> continua leve.</p>
        <ul><li>Formato: PDF</li><li>Tamanho máximo: 25 MB</li><li>Versão atual: {report ? `${report.fileName} · ${formatFileSize(report.size)}` : "ainda não publicada"}</li></ul>
        <form onSubmit={handleSubmit}>
          <label>PDF comprimido<input type="file" accept="application/pdf" onChange={selectFile} disabled={uploading} /></label>
          {file && <p className={styles.file}>Selecionado: <strong>{file.name}</strong> · {formatFileSize(file.size)}</p>}
          <button type="submit" disabled={uploading}>{uploading ? `Enviando ${progress}%...` : report ? "Substituir relatório" : "Publicar relatório"}</button>
          {report && <button className={styles.secondary} type="button" onClick={openReport}>Abrir versão publicada</button>}
          {!report && <button className={styles.secondary} type="button" disabled={uploading} onClick={finalizeExistingFile}>Concluir arquivo já enviado</button>}
        </form>
        {error && <p className={styles.error} role="alert">{error}</p>}
        {message && <p className={styles.success} role="status">{message}</p>}
      </section>
    </main>
  );
}
