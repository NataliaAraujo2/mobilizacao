export const FORM_INTEGRATIONS = Object.freeze({
  responsible: {
    label: 'Cadastro de responsável regional',
    description: 'Leva nome, telefone e e-mail para o cadastro de acesso da regional.',
    route: '/admin/acessos-consulta',
    stateKey: 'responsibleDraft',
    fields: [
      { id: 'contactName', label: 'Nome do responsável' },
      { id: 'contactPhone', label: 'Telefone' },
      { id: 'contactEmail', label: 'E-mail' },
    ],
  },
  volunteer: {
    label: 'Cadastro de voluntário',
    description: 'Leva os dados da resposta para o cadastro de voluntários.',
    route: '/admin/voluntarios',
    stateKey: 'volunteerDraft',
    fields: [
      { id: 'fullName', label: 'Nome completo' },
      { id: 'email', label: 'E-mail' },
      { id: 'phone', label: 'Telefone' },
      { id: 'cpf', label: 'CPF' },
      { id: 'rg', label: 'RG' },
      { id: 'birthDate', label: 'Data de nascimento' },
    ],
  },
});

export function formQuestionChoices(definition) {
  return definition.sections.flatMap(section => section.questions.map(question => ({
    id: `${section.id}/${question.id}`,
    label: `${section.title} · ${question.title}`,
  })));
}
