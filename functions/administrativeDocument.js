import { fileURLToPath } from 'node:url';

export const ADMIN_DOCUMENT_NAME = 'Guia-Pratico-de-Comunicacao-Coordenacoes.pdf';
export const ADMIN_DOCUMENT_PATH = fileURLToPath(new URL('./documents/guia-comunicacao-coordenacoes.pdf', import.meta.url));
export const ADMIN_DOCUMENT_URL = 'https://mobilizacao.web.app/coordenacao/documento';

export function canReadAdministrativeDocument(claims) {
  return claims?.status === 'active' && ['branchViewer', 'superAdmin'].includes(claims?.role);
}

export function administrativeDocumentAttachment(role) {
  return ['branchViewer', 'superAdmin'].includes(role)
    ? [{ filename: ADMIN_DOCUMENT_NAME, path: ADMIN_DOCUMENT_PATH, contentType: 'application/pdf' }]
    : [];
}
