import test from 'node:test';
import assert from 'node:assert/strict';
import { documentLinkToken, isPublicDocumentUrl } from '../src/domain/documentLinks.js';

test('tokens são estáveis, compactos e distintos por documento', async () => {
  const token = await documentLinkToken('document-a');
  assert.match(token, /^[a-f0-9]{24}$/);
  assert.equal(token, await documentLinkToken('document-a'));
  assert.notEqual(token, await documentLinkToken('document-b'));
});

test('destinos aceitam somente downloads HTTPS do Firebase', () => {
  assert.equal(isPublicDocumentUrl('https://firebasestorage.googleapis.com/v0/b/bucket/o/doc.pdf?alt=media&token=test'), true);
  for (const url of ['javascript:alert(1)', 'https://example.com/file.pdf', 'https://firebasestorage.googleapis.com.evil.test/v0/b/test?alt=media', 'http://firebasestorage.googleapis.com/v0/b/test?alt=media']) assert.equal(isPublicDocumentUrl(url), false);
});
