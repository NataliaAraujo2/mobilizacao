import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeCoordinationContacts, publicCoordinationMetadata } from '../src/domain/coordinationContacts.js';

test('contatos públicos são normalizados e não incluem os dados privados do responsável', () => {
  assert.deepEqual(normalizeCoordinationContacts({ phone: '(61) 99999-1234', email: ' ESTADO@EXEMPLO.ORG ', contactName: 'Privado', password: 'segredo' }), { phone: '61999991234', email: 'estado@exemplo.org' });
  assert.deepEqual(publicCoordinationMetadata({ name: 'Coordenação DF', state: 'DF', status: 'active', contactPhone: '61988887777', contactEmail: 'pessoal@example.org', password: 'segredo' }), { name: 'Coordenação DF', state: 'DF', status: 'active' });
});

test('contatos vazios permanecem vazios, sem recorrer ao perfil privado', () => {
  assert.deepEqual(normalizeCoordinationContacts({ contactPhone: '61988887777', contactEmail: 'pessoal@example.org' }), { phone: '', email: '' });
});

test('telefone e e-mail inválidos são rejeitados', () => {
  assert.throws(() => normalizeCoordinationContacts({ phone: '123' }));
  assert.throws(() => normalizeCoordinationContacts({ email: 'sem-arroba' }));
});
