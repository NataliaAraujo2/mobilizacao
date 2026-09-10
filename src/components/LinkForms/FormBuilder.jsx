import { useState } from 'react';
import { LIMITS, QUESTION_TYPES } from '../../../functions/formDomain';
import FormFields from './FormFields';
import { initialAnswers, newQuestion, newSection } from '../../domain/forms/editorModel';
import styles from './LinkForms.module.css';

function reordered(items, i, offset) { const result = [...items]; [result[i], result[i + offset]] = [result[i + offset], result[i]]; return result; }
function Controls({ name, index, total, onMove, onDuplicate, onDelete, canDuplicate = true }) {
  return <div className={styles.toolbar} aria-label={`Ações: ${name}`}>
    <button type="button" disabled={index === 0} onClick={() => onMove(-1)} aria-label={`Mover ${name} para cima`}>↑ Subir</button>
    <button type="button" disabled={index === total - 1} onClick={() => onMove(1)} aria-label={`Mover ${name} para baixo`}>↓ Descer</button>
    <button type="button" disabled={!canDuplicate} onClick={onDuplicate}>Duplicar {name}</button>
    <button type="button" onClick={() => { if (window.confirm(`Excluir ${name}?`)) onDelete(); }}>Excluir {name}</button>
  </div>;
}
export default function FormBuilder({ value, onChange }) {
  const [preview, setPreview] = useState(false);
  const [answers, setAnswers] = useState({});
  const count = value.sections.reduce((n, s) => n + s.questions.length, 0);
  const updateSection = (i, patch) => onChange({ ...value, sections: value.sections.map((s, index) => index === i ? { ...s, ...patch } : s) });
  const updateQuestion = (i, j, patch) => updateSection(i, { questions: value.sections[i].questions.map((q, index) => index === j ? { ...q, ...patch } : q) });
  return <section aria-label="Construtor de formulário">
    <div className={styles.toolbar}><h2>Construtor</h2><button type="button" aria-pressed={preview} onClick={() => { setAnswers(initialAnswers(value)); setPreview(!preview); }}>{preview ? 'Voltar à edição' : 'Pré-visualizar'}</button></div>
    {preview ? <div className={styles.card}><p className={styles.notice}>Pré-visualização — nenhuma resposta será enviada.</p><FormFields definition={value} answers={answers} onChange={setAnswers} /></div> : <>
      <div className={styles.card}>
        <label>Título do formulário<input maxLength={160} value={value.title} onChange={e => onChange({ ...value, title: e.target.value })} /></label>
        <label>Descrição<textarea maxLength={3000} value={value.description} onChange={e => onChange({ ...value, description: e.target.value })} /></label>
        <label>Instruções (opcional)<textarea maxLength={3000} value={value.instructions} onChange={e => onChange({ ...value, instructions: e.target.value })} /></label>
        <label>Validade padrão em dias<input type="number" min={1} max={365} value={value.validityDays} onChange={e => onChange({ ...value, validityDays: Number(e.target.value) })} /></label>
      </div>
      <p>{value.sections.length}/{LIMITS.sections} seções · {count}/{LIMITS.questions} perguntas. As edições ficam locais até salvar.</p>
      {value.sections.map((s, i) => <section className={styles.card} key={s.id}>
        <h3>Seção {i + 1}</h3>
        <label>Título da seção<input maxLength={160} value={s.title} onChange={e => updateSection(i, { title: e.target.value })} /></label>
        <label className={styles.check}><input type="checkbox" checked={s.repeatable} onChange={e => updateSection(i, { repeatable: e.target.checked })} />Seção repetível</label>
        {s.repeatable && <label>Texto do botão para repetir<input maxLength={80} value={s.addLabel} onChange={e => updateSection(i, { addLabel: e.target.value })} /></label>}
        <Controls name={`seção ${i + 1}`} index={i} total={value.sections.length} onMove={offset => onChange({ ...value, sections: reordered(value.sections, i, offset) })} canDuplicate={value.sections.length < LIMITS.sections && count + s.questions.length <= LIMITS.questions} onDuplicate={() => onChange({ ...value, sections: [...value.sections.slice(0, i + 1), { ...s, id: crypto.randomUUID(), questions: s.questions.map(q => ({ ...q, id: crypto.randomUUID() })) }, ...value.sections.slice(i + 1)] })} onDelete={() => onChange({ ...value, sections: value.sections.filter((_, index) => index !== i) })} />
        {s.questions.map((q, j) => <div className={styles.questionCard} key={q.id}>
          <label>Pergunta {j + 1}<input maxLength={300} value={q.title} onChange={e => updateQuestion(i, j, { title: e.target.value })} /></label>
          <label>Tipo de resposta<select value={q.type} onChange={e => updateQuestion(i, j, { type: e.target.value })}>{Object.entries(QUESTION_TYPES).map(([type, label]) => <option key={type} value={type}>{label}</option>)}</select></label>
          <label className={styles.check}><input type="checkbox" checked={q.required} onChange={e => updateQuestion(i, j, { required: e.target.checked })} />Obrigatória</label>
          {['single', 'select'].includes(q.type) && <label>Opções (uma por linha, de 2 a 30)<textarea value={q.options.join('\n')} onChange={e => updateQuestion(i, j, { options: e.target.value.split('\n') })} maxLength={4500} /></label>}
          <Controls name={`pergunta ${j + 1}`} index={j} total={s.questions.length} onMove={offset => updateSection(i, { questions: reordered(s.questions, j, offset) })} canDuplicate={count < LIMITS.questions} onDuplicate={() => updateSection(i, { questions: [...s.questions.slice(0, j + 1), { ...q, id: crypto.randomUUID() }, ...s.questions.slice(j + 1)] })} onDelete={() => updateSection(i, { questions: s.questions.filter((_, index) => index !== j) })} />
        </div>)}
        <button type="button" disabled={count >= LIMITS.questions} onClick={() => updateSection(i, { questions: [...s.questions, newQuestion()] })}>Adicionar pergunta</button>
      </section>)}
      <button type="button" disabled={value.sections.length >= LIMITS.sections || count >= LIMITS.questions} onClick={() => onChange({ ...value, sections: [...value.sections, newSection()] })}>Adicionar seção</button>
    </>}
  </section>;
}
