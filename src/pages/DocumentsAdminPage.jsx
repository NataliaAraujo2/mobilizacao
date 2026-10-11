import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../auth/useAuth';
import PageHeading from '../components/PageHeading';
import { validatePublicDocument } from '../domain/publicDocuments';
import { listPublicDocuments, uploadPublicDocument, deletePublicDocument } from '../services/publicDocumentsService';
import styles from './DocumentsAdminPage.module.css';

export default function DocumentsAdminPage() {
  const { user } = useAuth();
  const [documents, setDocuments] = useState([]);
  const [file, setFile] = useState(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [progress, setProgress] = useState(0);
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const inputRef = useRef(null);
  useEffect(() => {
    let active = true;
    listPublicDocuments().then(items => { if (active) setDocuments(items); })
      .catch(() => { if (active) setError('Não foi possível carregar os documentos.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  function selectFile(selected) {
    if (busy) return;
    setError(''); setMessage(''); setConsent(false);
    try { validatePublicDocument(selected); setFile(selected); }
    catch (failure) { setFile(null); setError(failure.message); if (inputRef.current) inputRef.current.value = ''; }
  }
  async function upload(event) {
    event.preventDefault();
    if (!file || !consent || busy || loading) return;
    setBusy('upload'); setError(''); setMessage(''); setProgress(0);
    try {
      const saved = await uploadPublicDocument(file, user.uid, setProgress);
      setDocuments(current => [saved, ...current]);
      setFile(null); setConsent(false); inputRef.current.value = '';
      setMessage('PDF publicado. Use “Copiar link” para compartilhar.');
    } catch (failure) { setError(failure.message || 'Não foi possível publicar o PDF.'); }
    finally { setBusy(''); }
  }
  async function remove(item) {
    if (busy || !window.confirm(`Excluir “${item.name}”? O link deixará de funcionar. Cópias já baixadas não serão apagadas.`)) return;
    setBusy(item.id); setError(''); setMessage('');
    try {
      await deletePublicDocument(item);
      setDocuments(current => current.filter(document => document.id !== item.id));
      setMessage('Arquivo e registro excluídos. Para recuperá-los será necessário enviar o PDF novamente.');
    } catch (failure) { setError(failure.message || 'Não foi possível excluir o documento. Tente novamente.'); }
    finally { setBusy(''); }
  }
  async function copy(item) {
    try { await navigator.clipboard.writeText(item.url); setMessage(`Link de “${item.name}” copiado.`); setError(''); }
    catch { setError('Não foi possível copiar automaticamente. Selecione e copie o link abaixo do documento.'); }
  }
  async function refresh() {
    setLoading(true); setError('');
    try { setDocuments(await listPublicDocuments()); }
    catch { setError('Não foi possível atualizar a lista.'); }
    finally { setLoading(false); }
  }
  const visible = documents.filter(item => item.name.toLocaleLowerCase('pt-BR').includes(search.toLocaleLowerCase('pt-BR')));
  return <main className={styles.page}>
    <PageHeading eyebrow="Comunicação" title="Documentos por link público" description="Envie PDFs e compartilhe links para visualização, sem exigir login." />
    <section className={styles.card}>
      <h2>Enviar documento</h2>
      <p>Somente PDF, até 40 MB. Não envie senhas, documentos pessoais ou materiais confidenciais.</p>
      <form onSubmit={upload}>
        <div className={styles.dropzone} onDragOver={event => event.preventDefault()} onDrop={event => { event.preventDefault(); selectFile(event.dataTransfer.files[0]); }}>
          <label>Arraste o PDF aqui ou selecione o arquivo<input ref={inputRef} type="file" accept="application/pdf,.pdf" disabled={Boolean(busy)} onChange={event => { if (event.target.files[0]) selectFile(event.target.files[0]); }} /></label>
        </div>
        {file && <p>Arquivo selecionado: <strong>{file.name}</strong> — {(file.size / 1024 / 1024).toFixed(1).replace('.', ',')} MB</p>}
        <label className={styles.consent}><input type="checkbox" checked={consent} disabled={Boolean(busy)} onChange={event => setConsent(event.target.checked)} /> Confirmo que este documento pode ser acessado publicamente por qualquer pessoa com o link.</label>
        {busy === 'upload' && <p role="status">Upload: {progress}%</p>}
        <button type="submit" disabled={!file || !consent || loading || Boolean(busy)}>{busy === 'upload' ? 'Enviando…' : 'Enviar e gerar link público'}</button>
      </form>
    </section>
    {error && <p role="alert">{error}</p>}{message && <p role="status">{message}</p>}
    <section className={styles.card}>
      <h2>Arquivos enviados</h2>
      <label>Buscar por nome<input type="search" value={search} onChange={event => setSearch(event.target.value)} /></label>
      <p>{visible.length} de {documents.length} documento(s)</p>
      <button type="button" disabled={loading || Boolean(busy)} onClick={refresh}>Atualizar lista</button>
      {loading ? <p role="status">Carregando…</p> : visible.length === 0 ? <p>Nenhum documento encontrado.</p> : <div className={styles.list}>{visible.map(item => <article key={item.id}>
        <h3>{item.name}</h3>
        {item.size && <p>{(item.size / 1024 / 1024).toFixed(1).replace('.', ',')} MB</p>}
        {!item.path && <p>Documento legado: o link foi preservado. A exclusão por esta nova tela não está habilitada.</p>}
        <div className={styles.actions}><a href={item.url} target="_blank" rel="noopener noreferrer">Abrir PDF</a><button type="button" onClick={() => copy(item)}>Copiar link</button><button type="button" disabled={Boolean(busy) || !item.path} onClick={() => remove(item)}>{busy === item.id ? 'Excluindo…' : 'Excluir'}</button></div>
        <input aria-label={`Link público de ${item.name}`} readOnly value={item.url} onFocus={event => event.target.select()} />
      </article>)}</div>}
    </section>
  </main>;
}
