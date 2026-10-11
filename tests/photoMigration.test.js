import test from 'node:test';
import assert from 'node:assert/strict';
import { migratedPhotoName, planPhotoMigration, verifiedCopy } from '../scripts/photoMigration.mjs';

function action(path, name = 'foto antiga.jpg') {
  return { name: 'projects/test/databases/(default)/documents/actions/action-1', updateTime: '2026-10-11T00:00:00Z', fields: {
    branchId: { stringValue: 'sp' },
    photosBefore: { arrayValue: { values: [{ mapValue: { fields: { path: { stringValue: path }, name: { stringValue: name }, size: { integerValue: '100' } } } }] } },
  } };
}

test('plano usa nomes estáveis, mantém ordem e metadados e não altera o original', () => {
  const path = 'branches/sp/actions/action-1/before/ação.antes (1).webp';
  const source = action(path);
  const original = structuredClone(source);
  const plan = planPhotoMigration(source);
  const name = migratedPhotoName(path);
  assert.match(name, /^foto-[-a-f0-9]+\.webp$/);
  assert.equal(name, migratedPhotoName(path));
  assert.notEqual(name, migratedPhotoName(path + 'other'));
  assert.deepEqual(source, original);
  assert.deepEqual(plan.copies, [{ from: path, to: `branches/sp/actions/action-1/before/${name}` }]);
  const photo = plan.fields.photosBefore.arrayValue.values[0].mapValue.fields;
  assert.equal(photo.name.stringValue, name);
  assert.equal(photo.size.integerValue, '100');
  assert.deepEqual(planPhotoMigration({ ...source, fields: { ...source.fields, ...plan.fields } }).fields, {});
});

test('não migra caminhos de outras ações, coordenações ou fases', () => {
  for (const path of ['branches/rj/actions/action-1/before/foto.webp', 'branches/sp/actions/action-2/before/foto.webp', 'branches/sp/actions/action-1/after/foto.webp', 'uploads/private.pdf']) {
    const plan = planPhotoMigration(action(path));
    assert.equal(plan.skipped, 1);
    assert.deepEqual(plan.fields, {});
    assert.deepEqual(plan.copies, []);
  }
});

test('a referência só pode ser trocada depois de verificar conteúdo e tamanho da cópia', async () => {
  const metadata = { size: '100', md5Hash: 'hash', contentType: 'image/webp', generation: '1' };
  let copied = false;
  await verifiedCopy({ from: 'original', to: 'new' }, {
    metadata: async () => metadata,
    copy: async () => { copied = true; },
  });
  assert.equal(copied, true);
  await assert.rejects(verifiedCopy({ from: 'original', to: 'new' }, {
    metadata: async path => path === 'original' ? metadata : { ...metadata, md5Hash: 'different' },
    copy: async () => {},
  }), /não corresponde/);
  await assert.rejects(verifiedCopy({ from: 'missing', to: 'new' }, {
    metadata: async () => { throw new Error('Arquivo não encontrado'); },
    copy: async () => assert.fail('Não deve copiar um arquivo ausente'),
  }), /não encontrado/);
});
