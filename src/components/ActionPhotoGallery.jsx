import { useEffect, useState } from "react";
import { getStorageService } from "../services/firebaseStorage";
import ImageFrame from "./ImageFrame";
import styles from "./ActionPhotoGallery.module.css";

const PHASES = [
  ["photosBefore", "Antes"],
  ["photosDuring", "Durante"],
  ["photosAfter", "Depois"],
];

export default function ActionPhotoGallery({ action, onRemove, removingPath = '', grouped = false }) {
  const [photos, setPhotos] = useState([]);
  const [error, setError] = useState(false);
  const files = PHASES.flatMap(([field, label]) => (action[field] ?? []).map((file) => ({ ...file, field, label })));
  const photosKey = files.map((file) => file.path).join('|');

  useEffect(() => {
    let active = true;
    if (!files.length) { setPhotos([]); return undefined; }
    setError(false);
    getStorageService()
      .then(({ storage, ref, getDownloadURL }) => Promise.all(files.map(async (file) => ({ ...file, url: await getDownloadURL(ref(storage, file.path)) }))))
      .then((items) => { if (active) setPhotos(items); })
      .catch(() => { if (active) setError(true); });
    return () => { active = false; };
  }, [action.id, photosKey]);

  if (!files.length) return null;
  const photoCard = photo => <figure key={photo.path}><ImageFrame className={styles.photoFrame} src={photo.url} alt={`${photo.label}: ${photo.name || action.name}`} /><figcaption><span>{photo.label}</span>{onRemove && <button type="button" disabled={removingPath === photo.path} onClick={() => onRemove(photo)}>{removingPath === photo.path ? 'Excluindo…' : 'Excluir foto'}</button>}</figcaption></figure>;
  return <section className={styles.gallery} aria-label="Fotos da ação">
    <h3>Fotos da ação</h3>
    {error ? <p>Não foi possível carregar as fotos agora.</p> : photos.length === 0 ? <p>Carregando fotos…</p> : grouped ? <div className={styles.phaseList}>{PHASES.map(([field, label]) => { const phasePhotos = photos.filter(photo => photo.field === field); return <section className={styles.phase} key={field}><h4>{label}</h4>{phasePhotos.length ? <div className={styles.photoGrid}>{phasePhotos.map(photoCard)}</div> : <p>Nenhuma foto nesta etapa.</p>}</section>; })}</div> : <div className={styles.photoGrid}>{photos.map(photoCard)}</div>}
  </section>;
}
