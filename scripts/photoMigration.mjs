import { createHash } from 'node:crypto';

const PHASES = { photosBefore: 'before', photosDuring: 'during', photosAfter: 'after' };
const STANDARD_NAME = /^foto-[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}\.webp$/;

export function migratedPhotoName(path) {
  const hex = createHash('sha256').update(path).digest('hex').slice(0, 32);
  return `foto-${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}.webp`;
}

// Trabalha na representação REST sem modificar o documento original.
export function planPhotoMigration(document) {
  const actionId = document.name.split('/').at(-1);
  const branchId = document.fields?.branchId?.stringValue;
  const fields = {};
  const copies = [];
  let skipped = 0;
  for (const [field, phase] of Object.entries(PHASES)) {
    const original = document.fields?.[field];
    if (!original?.arrayValue?.values?.length) continue;
    const replacement = structuredClone(original);
    let changed = false;
    for (const photo of replacement.arrayValue.values) {
      const data = photo.mapValue?.fields;
      const path = data?.path?.stringValue;
      const prefix = `branches/${branchId}/actions/${actionId}/${phase}/`;
      if (!branchId || !path?.startsWith(prefix) || !path.slice(prefix.length) || path.slice(prefix.length).includes('/')) {
        skipped += 1;
        continue;
      }
      const basename = path.slice(prefix.length);
      const name = STANDARD_NAME.test(basename) ? basename : migratedPhotoName(path);
      const destination = prefix + name;
      if (destination !== path) copies.push({ from: path, to: destination });
      if (destination !== path || data.name?.stringValue !== name) {
        data.path = { stringValue: destination };
        data.name = { stringValue: name };
        changed = true;
      }
    }
    if (changed) fields[field] = replacement;
  }
  return { fields, copies, skipped };
}

export async function verifiedCopy(copy, storage) {
  const source = await storage.metadata(copy.from);
  if (source.contentType !== 'image/webp' || Number(source.size) <= 0 || !source.md5Hash) throw new Error('Imagem original inválida para a migração.');
  await storage.copy(copy.from, copy.to, source.generation);
  const destination = await storage.metadata(copy.to);
  if (destination.md5Hash !== source.md5Hash || destination.size !== source.size || destination.contentType !== source.contentType) throw new Error('A cópia não corresponde à imagem original.');
}
