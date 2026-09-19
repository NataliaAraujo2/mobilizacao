import { useEffect, useState } from "react";
import { getStorageService } from "../services/firebaseStorage";
import ImageFrame from "./ImageFrame";
import styles from "./ActionPhotoGallery.module.css";

const PHASES = [
  ["photosBefore", "Antes"],
  ["photosDuring", "Durante"],
  ["photosAfter", "Depois"],
];

export default function ActionPhotoGallery({ action }) {
  const [photos, setPhotos] = useState([]);
  const [error, setError] = useState(false);
  const files = PHASES.flatMap(([field, label]) => (action[field] ?? []).map((file) => ({ ...file, label })));
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
  return <section className={styles.gallery} aria-label="Fotos da ação">
    <h3>Fotos da ação</h3>
    {error ? <p>Não foi possível carregar as fotos agora.</p> : photos.length === 0 ? <p>Carregando fotos…</p> : <div>{photos.map((photo) => <figure key={photo.path}><ImageFrame src={photo.url} alt={`${photo.label}: ${photo.name || action.name}`} /><figcaption>{photo.label}</figcaption></figure>)}</div>}
  </section>;
}
