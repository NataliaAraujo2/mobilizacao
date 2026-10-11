import test from 'node:test';
import assert from 'node:assert/strict';
import { createPhotoFilename } from '../src/utils/photoFilename.js';
import { compressImage } from '../src/utils/imageCompression.js';

test('nome padronizado é único e compatível com a regra do Storage', () => {
  const names = Array.from({ length: 1000 }, () => createPhotoFilename());
  assert.equal(new Set(names).size, names.length);
  for (const name of names) {
    assert.match(name, /^foto-[a-f0-9-]{36}\.webp$/);
    assert.match(name, /^[-a-zA-Z0-9_]+\.webp$/);
  }
});

test('compressão ignora nomes originais com acentos, espaços, pontos e caminhos', async t => {
  const originalDocument = globalThis.document;
  const originalBitmap = globalThis.createImageBitmap;
  t.after(() => {
    if (originalDocument === undefined) delete globalThis.document;
    else globalThis.document = originalDocument;
    if (originalBitmap === undefined) delete globalThis.createImageBitmap;
    else globalThis.createImageBitmap = originalBitmap;
  });
  globalThis.createImageBitmap = async () => ({ width: 2000, height: 1000, close() {} });
  globalThis.document = { createElement: () => ({
    getContext: () => ({ drawImage() {} }),
    toBlob: callback => callback(new Blob(['compressed'], { type: 'image/webp' })),
  }) };
  const names = [];
  for (const name of ['foto.antes.2026.jpg', 'ação São Paulo (1).png', '../../foto.jpg', 'foto.jpg', 'foto.jpg']) {
    const result = await compressImage(new File(['image'], name, { type: 'image/jpeg' }));
    assert.match(result.name, /^foto-[a-f0-9-]{36}\.webp$/);
    assert.equal(result.type, 'image/webp');
    assert.equal(result.size, 10);
    names.push(result.name);
  }
  assert.equal(new Set(names).size, names.length);
});
