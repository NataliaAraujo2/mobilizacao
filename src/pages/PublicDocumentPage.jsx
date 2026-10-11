import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getDbService } from '../services/firebaseDb';
import { isPublicDocumentUrl } from '../domain/documentLinks';

export default function PublicDocumentPage() {
  const { token } = useParams();
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    setError('');
    async function open() {
      if (!/^[a-f0-9]{24}$/.test(token)) throw new Error('Link inválido.');
      const { db, doc, getDoc } = await getDbService(['doc', 'getDoc']);
      const link = await getDoc(doc(db, 'publicDocumentLinks', token));
      if (!link.exists() || !isPublicDocumentUrl(link.data().url)) throw new Error('Documento não encontrado ou excluído.');
      if (active) window.location.replace(link.data().url);
    }
    open().catch(failure => { if (active) setError(failure.message || 'Não foi possível abrir o documento. Tente novamente.'); });
    return () => { active = false; };
  }, [token]);
  return <main style={{ padding: '2rem', textAlign: 'center' }}><h1>Documento público</h1><p role={error ? 'alert' : 'status'}>{error || 'Abrindo PDF…'}</p>{error && <a href="/">Voltar ao site</a>}</main>;
}
