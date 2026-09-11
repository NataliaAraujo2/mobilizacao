import { useEffect, useState } from 'react';
import logoUrl from '../../assets/brand/mobilizacao-logo-colorido.webp';
import styles from './LinkForms.module.css';

const defaults = { title: 'AVISO IMPORTANTE', body: 'Escreva aqui o comunicado que deseja compartilhar.', footer: 'Moradia e Cidadania · MobilizAÇÃO' };
const storageKey = 'mobilizacao-notice-template';

function lines(ctx, text, width) {
  return text.split('\n').flatMap(paragraph => {
    const result = []; let line = '';
    for (const word of paragraph.split(/\s+/)) {
      if (line && ctx.measureText(line + ' ' + word).width > width) { result.push(line); line = ''; }
      for (const letter of (line ? ' ' : '') + word) {
        if (ctx.measureText(line + letter).width > width) { result.push(line); line = ''; }
        line += letter;
      }
    }
    result.push(line); return result;
  });
}

async function renderPoster(value) {
  const logo = new Image(); logo.src = logoUrl; await logo.decode();
  const canvas = document.createElement('canvas'); canvas.width = 1080;
  const ctx = canvas.getContext('2d');
  ctx.font = 'bold 48px Arial'; const title = lines(ctx, value.title, 904);
  ctx.font = '32px Arial'; const body = lines(ctx, value.body, 904);
  ctx.font = 'bold 24px Arial'; const footer = lines(ctx, value.footer, 904);
  const bodyY = 360 + title.length * 62 + 44;
  const footerHeight = Math.max(106, footer.length * 34 + 48);
  canvas.height = Math.max(1350, bodyY + body.length * 48 + 110 + footerHeight);
  ctx.fillStyle = '#f7f9fb'; ctx.fillRect(0, 0, 1080, canvas.height);
  ctx.fillStyle = '#0067a6'; ctx.fillRect(0, 0, 1080, 28);
  const ratio = Math.min(440 / logo.width, 210 / logo.height);
  ctx.drawImage(logo, (1080 - logo.width * ratio) / 2, 70, logo.width * ratio, logo.height * ratio);
  ctx.fillStyle = '#ee8123'; ctx.fillRect(88, 310, 904, 3);
  ctx.textBaseline = 'top'; ctx.fillStyle = '#005484'; ctx.font = 'bold 48px Arial';
  title.forEach((line, i) => ctx.fillText(line, 88, 360 + i * 62));
  ctx.fillStyle = '#273d4b'; ctx.font = '32px Arial';
  body.forEach((line, i) => ctx.fillText(line, 88, bodyY + i * 48));
  ctx.fillStyle = '#0067a6'; ctx.fillRect(0, canvas.height - footerHeight, 1080, footerHeight);
  ctx.fillStyle = '#fff'; ctx.font = 'bold 24px Arial'; ctx.textAlign = 'center';
  footer.forEach((line, i) => ctx.fillText(line, 540, canvas.height - footerHeight + 30 + i * 34));
  return canvas.toDataURL('image/png');
}

export default function NoticePoster() {
  const [value, setValue] = useState(defaults);
  const [preview, setPreview] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  useEffect(() => {
    let current = true; setPreview(''); setError('');
    renderPoster(value).then(url => { if (current) setPreview(url); }).catch(() => { if (current) setError('Não foi possível gerar a imagem. Tente novamente.'); });
    return () => { current = false; };
  }, [value]);
  function save() {
    try { localStorage.setItem(storageKey, JSON.stringify(value)); setMessage('Modelo salvo neste navegador.'); }
    catch { setError('Não foi possível salvar neste navegador.'); }
  }
  function restore() {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey));
      if (!saved || !['title', 'body', 'footer'].every(key => typeof saved[key] === 'string' && saved[key].length <= ({ title: 160, body: 3000, footer: 160 })[key])) throw new Error();
      setValue(saved); setMessage('Modelo carregado.');
    } catch { setError('Nenhum modelo válido salvo neste navegador.'); }
  }
  return <details className={styles.card}>
    <summary>Criar cartaz de aviso para WhatsApp</summary>
    <p>Monte um aviso com a logo da MobilizAÇÃO e baixe a imagem para enviar na sua lista de transmissão.</p>
    <div className={styles.grid}><div>
      <label>Título do aviso<input maxLength={160} value={value.title} onChange={e => setValue({ ...value, title: e.target.value })} /></label>
      <label>Texto do comunicado<textarea rows={8} maxLength={3000} value={value.body} onChange={e => setValue({ ...value, body: e.target.value })} /></label>
      <label>Rodapé<input maxLength={160} value={value.footer} onChange={e => setValue({ ...value, footer: e.target.value })} /></label>
      <div className={styles.toolbar}><button type="button" onClick={save}>Salvar modelo neste navegador</button><button type="button" onClick={restore}>Carregar modelo salvo</button></div>
      <p>O modelo salvo fica disponível neste dispositivo. Textos maiores aumentam a altura do cartaz.</p>
      {preview && value.title.trim() && value.body.trim() && <a className={styles.buttonLink} href={preview} download="aviso-mobilizacao.png">Baixar cartaz em PNG</a>}
      {message && <p role="status">{message}</p>}{error && <p role="alert">{error}</p>}
    </div><div><h3>Prévia do cartaz</h3>{preview ? <img src={preview} alt={`${value.title}: ${value.body}`} style={{ width: '100%', height: 'auto', border: '1px solid #d5dfe6' }} /> : <p role="status">Gerando cartaz…</p>}</div></div>
  </details>;
}
