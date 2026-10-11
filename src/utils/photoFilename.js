// O nome original nunca participa do caminho público de armazenamento.
export function createPhotoFilename() {
  return `foto-${crypto.randomUUID()}.webp`;
}
