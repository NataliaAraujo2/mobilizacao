export const ADMIN_DOCUMENT_ROUTE = '/coordenacao/documento';
export function administrativeDocumentMessage() {
  return `\n\nGuia Prático de Comunicação para as Coordenações Estaduais:\n${window.location.origin}${ADMIN_DOCUMENT_ROUTE}\nEntre com seu acesso para abrir ou baixar o documento.`;
}
