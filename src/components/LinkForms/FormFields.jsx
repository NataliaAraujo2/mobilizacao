import { LIMITS } from '../../../functions/formDomain';
import styles from './LinkForms.module.css';
import ContactInput from '../ContactInput';

export default function FormFields({ definition, answers, onChange, readOnly = false }) {
  function change(sectionId, index, questionId, value) {
    onChange({ ...answers, [sectionId]: answers[sectionId].map((g, i) => i === index ? { ...g, [questionId]: value } : g) });
  }
  return <>
    <h1>{definition.title}</h1><p className={styles.multiline}>{definition.description}</p>
    {definition.instructions && <p className={styles.notice}>{definition.instructions}</p>}
    {!readOnly && <p>* Campo obrigatório</p>}
    {definition.sections.map(s => <section className={styles.card} key={s.id} aria-labelledby={`section-${s.id}`}>
      <h2 id={`section-${s.id}`}>{s.title}</h2>
      {(answers[s.id] ?? [{}]).map((group, i) => <fieldset className={styles.group} key={i}>
        <legend>{s.repeatable ? `${s.title} — ${i + 1}` : 'Respostas'}</legend>
        {s.questions.map(q => {
          const fieldId = `${s.id}-${i}-${q.id}`;
          const value = group[q.id] ?? '';
          const props = { id: fieldId, name: fieldId, required: q.required, value, onChange: e => change(s.id, i, q.id, e.target.value) };
          if (readOnly) return <div className={styles.question} key={q.id}><strong>{q.title}</strong><p className={styles.multiline}>{value || 'Não informado'}</p></div>;
          return <div className={styles.question} key={q.id}>
            <label htmlFor={fieldId}>{q.title}{q.required ? ' *' : ' (opcional)'}</label>
            {q.type === 'long' ? <textarea {...props} maxLength={4000} rows={4} />
              : ['single', 'boolean'].includes(q.type) ? <fieldset className={styles.choices}><legend className={styles.srOnly}>{q.title}</legend>{(q.type === 'boolean' ? ['Sim', 'Não'] : q.options).map(option => <label key={option}><input type="radio" name={fieldId} required={q.required} value={option} checked={value === option} onChange={() => change(s.id, i, q.id, option)} />{option}</label>)}{!q.required && <button type="button" onClick={() => change(s.id, i, q.id, '')}>Limpar seleção</button>}</fieldset>
              : q.type === 'select' ? <select {...props}><option value="">Selecione</option>{q.options.map(o => <option key={o}>{o}</option>)}</select>
              : ['phone', 'email'].includes(q.type) ? <ContactInput {...props} type={q.type === 'phone' ? 'tel' : 'email'} maxLength={500} />
              : <input {...props} type={({ number: 'number', money: 'number', date: 'date' })[q.type] ?? 'text'} step={q.type === 'money' ? '0.01' : 'any'} maxLength={500} inputMode={q.type === 'document' ? 'numeric' : undefined} />}
          </div>;
        })}
        {s.repeatable && !readOnly && answers[s.id].length > 1 && <button type="button" onClick={() => { if (window.confirm('Remover este item e suas respostas?')) onChange({ ...answers, [s.id]: answers[s.id].filter((_, index) => index !== i) }); }}>Remover item {i + 1}</button>}
      </fieldset>)}
      {s.repeatable && !readOnly && <button type="button" disabled={answers[s.id].length >= LIMITS.repeats} onClick={() => onChange({ ...answers, [s.id]: [...answers[s.id], {}] })}>{s.addLabel || 'Adicionar item'}</button>}
    </section>)}
  </>;
}
