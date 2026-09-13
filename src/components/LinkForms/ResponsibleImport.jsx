import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { listBranches } from '../../services/branchesService';
import styles from './LinkForms.module.css';

export default function ResponsibleImport({ definition, response, request }) {
  const navigate = useNavigate();
  const [branches, setBranches] = useState([]);
  const [error, setError] = useState('');
  const [branchId, setBranchId] = useState(request.branchId ?? '');
  const [mapping, setMapping] = useState({ contactName: '', contactPhone: '', contactEmail: '' });
  const choices = definition.sections.flatMap(section => (response.answers[section.id] ?? []).flatMap((group, index) => section.questions.map(question => ({
    id: `${section.id}/${index}/${question.id}`, label: `${section.title}${section.repeatable ? ` · Item ${index + 1}` : ''} · ${question.title}`, value: group[question.id] ?? '',
  }))));
  useEffect(() => {
    let current = true;
    listBranches().then(items => { if (current) setBranches(items.filter(b => b.status === 'active')); }).catch(() => { if (current) setError('Não foi possível carregar as regionais. Feche e abra a resposta para tentar novamente.'); });
    return () => { current = false; };
  }, []);
  const selected = key => choices.find(c => c.id === mapping[key])?.value ?? '';
  return <details className={styles.card}><summary>Usar resposta no cadastro de responsável</summary>
    <p>Escolha a regional e associe as respostas aos campos. Você poderá conferir e editar antes de salvar. Se já existir um responsável, será aberta a edição do contato.</p>
    {error && <p role="alert">{error}</p>}
    <label>Regional<select value={branchId} onChange={e => setBranchId(e.target.value)}><option value="">Selecione</option>{branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select></label>
    {Object.entries({ contactName: 'Nome do responsável', contactPhone: 'Telefone', contactEmail: 'E-mail' }).map(([key, label]) => <label key={key}>{label}<select value={mapping[key]} onChange={e => setMapping({ ...mapping, [key]: e.target.value })}><option value="">Preencher manualmente no cadastro</option>{choices.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}</select><small>{selected(key) || 'Nenhuma resposta selecionada'}</small></label>)}
    <button type="button" disabled={!branches.some(b => b.id === branchId)} onClick={() => navigate('/admin/acessos-consulta', { state: { responsibleDraft: { branchId, ...Object.fromEntries(Object.keys(mapping).filter(key => mapping[key]).map(key => [key, selected(key)])) } } })}>Conferir no cadastro de responsável</button>
  </details>;
}
