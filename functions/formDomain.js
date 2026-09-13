import { isValidEmail, isValidPhone } from './contactFields.js';
export const LIMITS = Object.freeze({ sections: 20, questions: 100, recipients: 200, repeats: 20, answer: 4000, payload: 100000 });
export const QUESTION_TYPES = Object.freeze({ short: 'Resposta curta', long: 'Texto longo', email: 'E-mail', phone: 'Telefone', document: 'CPF ou CNPJ', number: 'Número', money: 'Valor', date: 'Data', boolean: 'Sim ou não', single: 'Seleção única', select: 'Lista de opções' });
export const STATUSES = ['PENDENTE', 'RESPONDIDA', 'APROVADA', 'REJEITADA', 'CANCELADA', 'EXPIRADA'];
const INTEGRATION_FIELDS = Object.freeze({
  responsible: ['contactName', 'contactPhone', 'contactEmail'],
  volunteer: ['fullName', 'email', 'phone', 'cpf', 'rg', 'birthDate'],
});
export class FormValidationError extends Error {}
export function ensure(condition, message) { if (!condition) throw new FormValidationError(message); }
function text(value, max, required = true) {
  ensure(typeof value === 'string' && value.length <= max && (!required || value.trim().length > 0), 'Texto vazio ou acima do limite.');
  return value.trim();
}
function identifier(value) { ensure(typeof value === 'string' && /^[a-zA-Z0-9_-]{1,80}$/.test(value) && !['__proto__', 'constructor', 'prototype'].includes(value), 'Identificador inválido.'); return value; }
export function validateDefinition(input) {
  ensure(input && typeof input === 'object', 'Formulário inválido.');
  ensure(new TextEncoder().encode(JSON.stringify(input)).length <= 200000, 'Formulário acima do limite de 200 KB.');
  ensure(Array.isArray(input.sections) && input.sections.length > 0 && input.sections.length <= LIMITS.sections, `Use de 1 a ${LIMITS.sections} seções.`);
  const ids = new Set(); let count = 0;
  const unique = (id) => { identifier(id); ensure(!ids.has(id), 'Identificadores duplicados.'); ids.add(id); return id; };
  const sections = input.sections.map(s => {
    ensure(s && Array.isArray(s.questions) && s.questions.length > 0, 'Cada seção precisa de perguntas.');
    ensure(typeof s.repeatable === 'boolean', 'Seção inválida.');
    return { id: unique(s.id), title: text(s.title, 160), repeatable: s.repeatable, addLabel: text(s.addLabel ?? 'Adicionar item', 80), questions: s.questions.map(q => {
      count++; ensure(count <= LIMITS.questions, `Limite de ${LIMITS.questions} perguntas.`);
      ensure(Object.hasOwn(QUESTION_TYPES, q.type) && typeof q.required === 'boolean', 'Tipo de pergunta inválido.');
      let options = [];
      if (['single', 'select'].includes(q.type)) {
        ensure(Array.isArray(q.options) && q.options.length >= 2 && q.options.length <= 30, 'Informe de 2 a 30 opções.');
        options = q.options.map(o => text(o, 150)); ensure(new Set(options).size === options.length, 'Opções repetidas.');
      }
      return { id: unique(q.id), title: text(q.title, 300), type: q.type, required: q.required, options };
    }) };
  });
  const validityDays = Number(input.validityDays ?? 30);
  ensure(Number.isInteger(validityDays) && validityDays >= 1 && validityDays <= 365, 'Validade deve ser de 1 a 365 dias.');
  let integration;
  if (input.integration?.target) {
    const target = input.integration.target;
    ensure(Object.hasOwn(INTEGRATION_FIELDS, target), 'Destino de integração inválido.');
    const mapping = input.integration.mapping ?? {};
    ensure(mapping && typeof mapping === 'object' && !Array.isArray(mapping), 'Mapeamento de integração inválido.');
    ensure(Object.keys(mapping).every(field => INTEGRATION_FIELDS[target].includes(field)), 'Campo de integração inválido.');
    const questionIds = new Set(sections.flatMap(section => section.questions.map(question => `${section.id}/${question.id}`)));
    integration = { target, mapping: Object.fromEntries(Object.entries(mapping).filter(([, source]) => source).map(([field, source]) => {
      ensure(typeof source === 'string' && questionIds.has(source), 'Pergunta de integração inválida.');
      return [field, source];
    })) };
  }
  return { title: text(input.title, 160), description: text(input.description ?? '', 3000, false), instructions: text(input.instructions ?? '', 3000, false), validityDays, sections, integration: integration ?? null };
}
export function validateRecipients(recipients) {
  ensure(Array.isArray(recipients) && recipients.length > 0 && recipients.length <= LIMITS.recipients, `Informe de 1 a ${LIMITS.recipients} destinatários.`);
  return recipients.map(r => {
    const phone = text(r.phone ?? '', 30, false).replace(/\D/g, '');
    ensure(!phone || /^\d{10,15}$/.test(phone), 'Telefone deve ter de 10 a 15 dígitos.');
    return { name: text(r.name, 120), phone };
  });
}
export function requireManager(auth) {
  ensure(auth?.uid && auth.token?.role === 'superAdmin' && auth.token?.status === 'active', 'Gerenciamento permitido somente a superadministradores ativos.');
  return auth.uid;
}
export function effectiveStatus(request, campaign, now = Date.now()) {
  if (request.status === 'PENDENTE' && campaign.archived) return 'CANCELADA';
  return request.status === 'PENDENTE' && campaign.expiresAt <= now ? 'EXPIRADA' : request.status;
}
export function assertPending(request, campaign, now = Date.now()) {
  const status = effectiveStatus(request, campaign, now);
  ensure(!campaign.archived && status === 'PENDENTE', status === 'EXPIRADA' ? 'Este link está expirado.' : status === 'CANCELADA' || campaign.archived ? 'Este link foi cancelado.' : 'Este link já foi respondido.');
}
function validDocument(value) {
  const digits = value.replace(/\D/g, '');
  if (!/^(\d{11}|\d{14})$/.test(digits) || /^(\d)\1+$/.test(digits)) return false;
  const calc = (base, weights) => { const sum = [...base].reduce((n, d, i) => n + Number(d) * weights[i], 0); return sum % 11 < 2 ? 0 : 11 - sum % 11; };
  if (digits.length === 11) return calc(digits.slice(0, 9), [10,9,8,7,6,5,4,3,2]) === +digits[9] && calc(digits.slice(0, 10), [11,10,9,8,7,6,5,4,3,2]) === +digits[10];
  return calc(digits.slice(0,12), [5,4,3,2,9,8,7,6,5,4,3,2]) === +digits[12] && calc(digits.slice(0,13), [6,5,4,3,2,9,8,7,6,5,4,3,2]) === +digits[13];
}
export function validateAnswers(definition, answers) {
  ensure(answers && typeof answers === 'object' && !Array.isArray(answers) && JSON.stringify(answers).length <= LIMITS.payload, 'Respostas inválidas ou muito grandes.');
  ensure(Object.keys(answers).every(id => definition.sections.some(s => s.id === id)), 'Seção não solicitada.');
  const result = {};
  for (const s of definition.sections) {
    const groups = answers[s.id];
    ensure(Array.isArray(groups) && groups.length >= 1 && groups.length <= (s.repeatable ? LIMITS.repeats : 1), `Quantidade de itens inválida em ${s.title}.`);
    result[s.id] = groups.map(group => {
      ensure(group && typeof group === 'object' && !Array.isArray(group) && Object.keys(group).every(id => s.questions.some(q => q.id === id)), 'Pergunta não solicitada.');
      const normalized = {};
      for (const q of s.questions) {
        const value = text(group[q.id] ?? '', q.type === 'long' ? LIMITS.answer : 500, q.required);
        if (value) {
          let valid = true;
          if (q.type === 'email') valid = isValidEmail(value);
          if (q.type === 'phone') valid = isValidPhone(value);
          if (q.type === 'document') valid = /^[\d./\s-]+$/.test(value) && validDocument(value);
          if (['number', 'money'].includes(q.type)) valid = /^-?\d+(\.\d+)?$/.test(value) && Number.isFinite(Number(value)) && Math.abs(Number(value)) <= 1e15 && (q.type !== 'money' || /^-?\d+(\.\d{1,2})?$/.test(value));
          if (q.type === 'date') valid = /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0,10) === value;
          if (q.type === 'boolean') valid = ['Sim', 'Não'].includes(value);
          if (['single', 'select'].includes(q.type)) valid = q.options.includes(value);
          ensure(valid, `Resposta inválida: ${q.title}.`);
        }
        normalized[q.id] = value;
      }
      return normalized;
    });
  }
  return result;
}
export function whatsappMessage(name, title, link, custom = '') { return custom.trim() ? `${custom.trim()}\n${link}` : `Olá, ${name}! Por favor, responda ao formulário ‘${title}’: ${link}`; }
export function generalWhatsappMessage(title, description, link) { return `${[title.trim(), description.trim()].filter(Boolean).join('\n\n')}\n${link}`; }
export function whatsappUrl(phone, message) {
  let digits = String(phone ?? '').replace(/\D/g, '');
  if (!digits) return null;
  if (digits.length === 10 || digits.length === 11) digits = `55${digits}`;
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}
