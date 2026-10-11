import test from 'node:test';
import assert from 'node:assert/strict';
import { validatePublicDocument, documentStoragePath, MAX_DOCUMENT_SIZE } from '../src/domain/publicDocuments.js';

test('permite PDF de até 40 MB', () => {
  assert.doesNotThrow(() => validatePublicDocument({ name: 'guia.pdf', type: 'application/pdf', size: MAX_DOCUMENT_SIZE }));
  assert.equal(documentStoragePath('abc-123'), 'uploads/public-documents/abc-123.pdf');
});
test('rejeita tipo incorreto, arquivo vazio e acima do limite', () => {
  assert.throws(() => validatePublicDocument({ name: 'texto.pdf', type: 'text/plain', size: 100 }));
  assert.throws(() => validatePublicDocument({ name: 'guia.pdf', type: 'application/pdf', size: 0 }));
  assert.throws(() => validatePublicDocument({ name: 'guia.pdf', type: 'application/pdf', size: MAX_DOCUMENT_SIZE + 1 }));
});
