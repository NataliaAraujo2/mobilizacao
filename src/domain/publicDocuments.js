export const MAX_DOCUMENT_SIZE = 40 * 1024 * 1024;
export function validatePublicDocument(file) {
  if (!file || file.type !== 'application/pdf') throw new Error('Selecione um arquivo PDF.');
  if (file.size <= 0 || file.size > MAX_DOCUMENT_SIZE) throw new Error('O PDF deve ter até 40 MB e não pode estar vazio.');
  if (!file.name || file.name.length > 255) throw new Error('Use um nome de arquivo com até 255 caracteres.');
}
export function documentStoragePath(id) { return `uploads/public-documents/${id}.pdf`; }
