import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { canReadAdministrativeDocument, administrativeDocumentAttachment, ADMIN_DOCUMENT_PATH } from './administrativeDocument.js';

test('somente coordenações e superadmins ativos podem ler o documento', () => {
  for (const role of ['branchViewer', 'superAdmin']) assert.equal(canReadAdministrativeDocument({ role, status: 'active' }), true);
  for (const role of ['volunteer', 'admin', undefined]) assert.equal(canReadAdministrativeDocument({ role, status: 'active' }), false);
  for (const status of ['blocked', undefined]) assert.equal(canReadAdministrativeDocument({ role: 'superAdmin', status }), false);
  assert.equal(canReadAdministrativeDocument(null), false);
});
test('anexos não são incluídos para voluntários ou outros perfis', () => {
  assert.equal(administrativeDocumentAttachment('volunteer').length, 0);
  assert.equal(administrativeDocumentAttachment('branchViewer').length, 1);
  assert.equal(administrativeDocumentAttachment('superAdmin').length, 1);
});
test('PDF está disponível somente no pacote privado de funções', async () => {
  const content = await readFile(ADMIN_DOCUMENT_PATH);
  assert.equal(content.subarray(0, 5).toString(), '%PDF-');
});
