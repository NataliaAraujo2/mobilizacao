import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FORM_INTEGRATIONS, formQuestionChoices } from '../../domain/forms/integrationCatalog';
import { listBranches } from '../../services/branchesService';
import styles from './LinkForms.module.css';

function answerValue(response, source) {
  if (!source) return '';
  const [sectionId, questionId] = source.split('/');
  const groups = response.answers[sectionId] ?? [];
  return groups.map(group => group[questionId]).find(value => typeof value === 'string' && value.trim()) ?? '';
}

export default function ResponseIntegration({ definition, response, request }) {
  const navigate = useNavigate();
  // Campaigns created before integrations were configurable keep their original responsible-import behavior.
  const integration = definition.integration === undefined ? { target: 'responsible', mapping: {} } : definition.integration;
  const target = FORM_INTEGRATIONS[integration?.target];
  const [opened, setOpened] = useState(false);
  const [branches, setBranches] = useState([]);
  const [branchesLoaded, setBranchesLoaded] = useState(false);
  const [loadingBranches, setLoadingBranches] = useState(false);
  const [error, setError] = useState('');
  const [branchId, setBranchId] = useState(request.branchId ?? '');
  const [mapping, setMapping] = useState(integration?.mapping ?? {});

  useEffect(() => {
    if (!target || !opened || branchesLoaded) return undefined;
    let current = true;
    setLoadingBranches(true); setError('');
    listBranches().then(items => {
      if (!current) return;
      setBranches(items.filter(branch => branch.status === 'active'));
      setBranchesLoaded(true);
    }).catch(() => {
      if (current) setError('Não foi possível carregar as regionais. Feche e abra esta integração para tentar novamente.');
    }).finally(() => { if (current) setLoadingBranches(false); });
    return () => { current = false; };
  }, [opened, branchesLoaded, target]);

  if (!target) return null;
  const choices = formQuestionChoices(definition);
  const selected = key => answerValue(response, mapping[key]);
  const draft = { branchId, ...Object.fromEntries(target.fields.map(field => [field.id, selected(field.id)])) };

  return <details className={styles.card} onToggle={event => setOpened(event.currentTarget.open)}><summary>Usar resposta em: {target.label}</summary>
    <p>Associe ou ajuste os campos. Os dados serão abertos para conferência e só serão salvos após sua confirmação.</p>
    {loadingBranches && <p role="status">Carregando regionais…</p>}
    {error && <p role="alert">{error}</p>}
    <label>Regional<select value={branchId} onChange={event => setBranchId(event.target.value)} disabled={loadingBranches}><option value="">{loadingBranches ? 'Carregando…' : 'Selecione'}</option>{branches.map(branch => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select></label>
    {target.fields.map(field => <label key={field.id}>{field.label}<select value={mapping[field.id] ?? ''} onChange={event => setMapping({ ...mapping, [field.id]: event.target.value })}><option value="">Preencher manualmente no cadastro</option>{choices.map(choice => <option key={choice.id} value={choice.id}>{choice.label}</option>)}</select><small>{selected(field.id) || 'Nenhuma resposta selecionada'}</small></label>)}
    <button type="button" disabled={!branches.some(branch => branch.id === branchId)} onClick={() => navigate(target.route, { state: { [target.stateKey]: draft } })}>Conferir em {target.label.toLowerCase()}</button>
  </details>;
}
