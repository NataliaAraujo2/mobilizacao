import test from 'node:test';
import assert from 'node:assert/strict';
import { assertPending, LIMITS, requireManager, validateAnswers, validateDefinition, validateRecipients, whatsappMessage, whatsappUrl } from './formDomain.js';

export const sampleForm = () => ({ title: 'Unidades', description: 'Cadastro', instructions: '', validityDays: 30, sections: [{ id: 'section1', title: 'Representante', repeatable: false, addLabel: 'Adicionar unidade', questions: [{ id: 'name', title: 'Nome', type: 'short', required: true, options: [] }] }] });
test('criação de formulário normaliza definição e rejeita upload', () => {
  const form = sampleForm(); assert.equal(validateDefinition(form).title, 'Unidades');
  form.sections[0].questions[0].type = 'upload'; assert.throws(() => validateDefinition(form), /Tipo/);
});
test('integração opcional aceita destinos e apenas perguntas existentes', () => {
  const form = sampleForm();
  form.integration = { target: 'volunteer', mapping: { fullName: 'section1/name' } };
  assert.deepEqual(validateDefinition(form).integration, form.integration);
  form.integration.mapping.fullName = 'section1/inexistente';
  assert.throws(() => validateDefinition(form), /Pergunta de integração/);
  form.integration = { target: 'desconhecido', mapping: {} };
  assert.throws(() => validateDefinition(form), /Destino de integração/);
});
test('limites de seções, perguntas e opções', () => {
  const form = sampleForm(); form.sections = Array.from({ length: 21 }, (_, i) => ({ ...form.sections[0], id: `s${i}` })); assert.throws(() => validateDefinition(form), /seções/);
  const questions = sampleForm(); questions.sections[0].questions = Array.from({ length: 101 }, (_, i) => ({ ...questions.sections[0].questions[0], id: `q${i}` })); assert.throws(() => validateDefinition(questions), /perguntas/);
  const options = sampleForm(); Object.assign(options.sections[0].questions[0], { type: 'select', options: ['a', 'a'] }); assert.throws(() => validateDefinition(options), /repetidas/);
});
test('resposta válida e bloqueio de campos não solicitados', () => {
  const form = validateDefinition(sampleForm()); assert.deepEqual(validateAnswers(form, { section1: [{ name: 'Maria' }] }), { section1: [{ name: 'Maria' }] });
  assert.throws(() => validateAnswers(form, { section1: [{ name: 'Maria', admin: 'true' }] }), /não solicitada/);
  assert.throws(() => validateAnswers(form, { section1: [{ name: 'Maria' }], other: [{}] }), /não solicitada/);
  assert.throws(() => validateAnswers(form, { section1: [{}] }), /Texto/);
  assert.throws(() => validateAnswers(form, { section1: [{ name: 'x'.repeat(501) }] }), /Texto/);
});
test('seção repetível mantém os grupos e impõe limite', () => {
  const form = sampleForm(); const answers = { section1: [{ name: 'SP' }, { name: 'RJ' }] };
  assert.throws(() => validateAnswers(form, answers), /Quantidade/); form.sections[0].repeatable = true;
  assert.equal(validateAnswers(form, answers).section1.length, 2);
  assert.throws(() => validateAnswers(form, { section1: Array.from({ length: 21 }, () => ({ name: 'SP' })) }), /Quantidade/);
});
test('tipos validam e-mail, telefone, documento, número, valor, data e opções', () => {
  const samples = { email: ['a@example.org', 'inválido'], phone: ['(11) 99999-9999', '123'], document: ['529.982.247-25', '11111111111'], number: ['1.5', 'Infinity'], money: ['12.50', '12.555'], date: ['2026-02-28', '2026-02-30'], boolean: ['Sim', 'Talvez'], single: ['A', 'C'], select: ['B', 'C'], long: ['Texto longo', 'x'.repeat(4001)] };
  for (const [type, [valid, invalid]] of Object.entries(samples)) {
    const form = sampleForm(); Object.assign(form.sections[0].questions[0], { type, options: ['A', 'B'] });
    assert.doesNotThrow(() => validateAnswers(form, { section1: [{ name: valid }] }), type);
    assert.throws(() => validateAnswers(form, { section1: [{ name: invalid }] }), undefined, type);
  }
});
test('bloqueios de segunda resposta, link expirado e cancelado', () => {
  assert.throws(() => assertPending({ status: 'RESPONDIDA' }, { expiresAt: 200 }, 100), /respondido/);
  assert.throws(() => assertPending({ status: 'PENDENTE' }, { expiresAt: 100 }, 100), /expirado/);
  assert.throws(() => assertPending({ status: 'CANCELADA' }, { expiresAt: 200 }, 100), /cancelado/);
});
test('limite de destinatários e telefone opcional', () => {
  assert.equal(validateRecipients([{ name: 'Maria' }])[0].phone, '');
  assert.equal(validateRecipients(Array.from({ length: LIMITS.recipients }, () => ({ name: 'Maria' }))).length, 200);
  assert.throws(() => validateRecipients(Array.from({ length: 201 }, () => ({ name: 'Maria' }))), /200/);
});
test('gerenciamento exige superadministrador ativo', () => {
  for (const auth of [null, { uid: 'b', token: { role: 'branchViewer', status: 'active' } }, { uid: 'a', token: { role: 'superAdmin', status: 'blocked' } }]) assert.throws(() => requireManager(auth));
  assert.equal(requireManager({ uid: 'a', token: { role: 'superAdmin', status: 'active' } }), 'a');
});
test('fila WhatsApp personaliza nome, título e token; telefone brasileiro recebe 55', () => {
  const message = whatsappMessage('Maria', 'Unidades', 'https://example.org/formularios/abc');
  assert.equal(message, 'Olá, Maria! Por favor, responda ao formulário ‘Unidades’: https://example.org/formularios/abc');
  assert.equal(whatsappUrl('(11) 99999-9999', message), `https://wa.me/5511999999999?text=${encodeURIComponent(message)}`);
  assert.match(whatsappUrl('1133334444', message), /wa.me\/551133334444/);
  assert.match(whatsappUrl('5511999999999', message), /wa.me\/5511999999999\?/);
  assert.equal(whatsappUrl('', message), null);
});
