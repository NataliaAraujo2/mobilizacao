export const newQuestion = () => ({ id: crypto.randomUUID(), title: '', type: 'short', required: false, options: [] });
export const newSection = () => ({ id: crypto.randomUUID(), title: '', repeatable: false, addLabel: 'Adicionar item', questions: [newQuestion()] });
export const blankForm = () => ({ title: '', description: '', instructions: '', validityDays: 30, sections: [newSection()] });
export const initialAnswers = definition => Object.fromEntries(definition.sections.map(s => [s.id, [{}]]));
