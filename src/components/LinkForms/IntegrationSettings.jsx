import { FORM_INTEGRATIONS, formQuestionChoices } from '../../domain/forms/integrationCatalog';
import styles from './LinkForms.module.css';

export default function IntegrationSettings({ definition, onChange }) {
  const integration = definition.integration ?? { target: '', mapping: {} };
  const target = FORM_INTEGRATIONS[integration.target];
  const choices = formQuestionChoices(definition);
  const update = next => onChange({ ...definition, integration: next.target ? next : undefined });

  return <section className={styles.card}>
    <h3>Usar respostas no sistema <small>(opcional)</small></h3>
    <p>Escolha para qual cadastro esta resposta poderá ser enviada depois da revisão.</p>
    <label>Destino da integração<select value={integration.target} onChange={event => update({ target: event.target.value, mapping: {} })}>
      <option value="">Somente coletar respostas</option>
      {Object.entries(FORM_INTEGRATIONS).map(([id, item]) => <option key={id} value={id}>{item.label}</option>)}
    </select></label>
    {target && <>
      <p>{target.description}</p>
      {target.fields.map(field => <label key={field.id}>{field.label}<select value={integration.mapping?.[field.id] ?? ''} onChange={event => update({ ...integration, mapping: { ...integration.mapping, [field.id]: event.target.value } })}>
        <option value="">Preencher manualmente na conferência</option>
        {choices.map(choice => <option key={choice.id} value={choice.id}>{choice.label}</option>)}
      </select></label>)}
    </>}
  </section>;
}
