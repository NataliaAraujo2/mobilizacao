import { useEffect, useState } from 'react';
import { getFunctionsService } from '../services/firebaseFunctions';
import styles from './ReportViewerPage.module.css';

export default function AdministrativeDocumentPage() {
  const [document, setDocument] = useState(null);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    let blobUrl;
    setDocument(null);
    setError('');
    (async () => {
      const { functions, httpsCallable } = await getFunctionsService();
      const { data } = await httpsCallable(functions, 'getAdministrativeDocument')({});
      if (!active) return;
      const binary = atob(data.base64);
      const bytes = Uint8Array.from(binary, character => character.charCodeAt(0));
      blobUrl = URL.createObjectURL(new Blob([bytes], { type: data.contentType }));
      setDocument({ url: blobUrl, filename: data.filename });
    })().catch(() => {
      if (active) setError('Não foi possível carregar o guia. Verifique sua conexão e se seu acesso continua ativo.');
    });
    return () => { active = false; if (blobUrl) URL.revokeObjectURL(blobUrl); };
  }, [attempt]);
  return <main className={styles.page}>
    <header className={styles.header}>
      <div><p>Coordenações estaduais e superadmins</p><h1>Guia Prático de Comunicação</h1><span>Instagram e LinkedIn · PDF · aproximadamente 16 MB</span></div>
      {document && <div className={styles.actions}><a href={document.url} download={document.filename}>Baixar PDF</a><a href={document.url} target="_blank" rel="noopener noreferrer">Abrir em tela cheia ↗</a></div>}
    </header>
    {!document && !error && <p className={styles.loading} aria-busy="true">Carregando o guia...</p>}
    {error && <div className={styles.error} role="alert"><p>{error}</p><button onClick={() => setAttempt(value => value + 1)}>Tentar novamente</button></div>}
    {document && <iframe className={styles.viewer} src={`${document.url}#toolbar=1&navpanes=0`} title="Guia Prático de Comunicação para as Coordenações Estaduais" />}
  </main>;
}
