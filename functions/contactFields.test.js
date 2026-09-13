import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatPhone, normalizePhone, normalizeEmail, isValidEmail, isValidPhone } from './contactFields.js';

test('telefone formata fixos e celulares sem perder números ou código internacional', () => {
  assert.equal(formatPhone('1133334444'), '(11) 3333-4444');
  assert.equal(formatPhone('11999998888'), '(11) 99999-8888');
  assert.equal(formatPhone('5511999998888'), '+55 (11) 99999-8888');
  assert.equal(formatPhone('+1 202 555 0123'), '+12025550123');
  for (const phone of ['11999998888', '5511999998888', '+442079460123', '1234567890123456']) {
    assert.equal(normalizePhone(formatPhone(phone)), normalizePhone(phone));
    assert.equal(formatPhone(formatPhone(phone)), formatPhone(phone));
  }
  assert.equal(formatPhone(''), '');
  assert.equal(isValidPhone('123'), false);
  assert.equal(isValidPhone('1234567890123456'), false);
  assert.equal(isValidPhone('(11) 99999-8888'), true);
});
test('e-mail aceita domínios variados e rejeita formatos incompletos', () => {
  for (const email of ['nome@gmail.com', 'nome@empresa.com.br', 'nome@caixa.gov.br', 'nome+evento@sub.exemplo.org']) assert.equal(isValidEmail(email), true);
  for (const email of ['nome@', '@empresa.com', 'nome@empresa', 'nome@@empresa.com', 'nome@empresa..com', 'nome com espaço@empresa.com']) assert.equal(isValidEmail(email), false);
  assert.equal(normalizeEmail('  Nome@CAIXA.GOV.BR  '), 'nome@caixa.gov.br');
});
