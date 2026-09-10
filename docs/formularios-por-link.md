# Formulários por link

Implementação local, sem commit ou deploy. A central fica em `/admin/formularios`, com acesso pelo painel administrativo. A página `/formularios/:token` funciona fora do layout administrativo e sem exigir autenticação.

## Análise do projeto antes das alterações

- Aplicativo React 19/Vite, React Router, páginas carregadas sob demanda e CSS Modules usando as variáveis de `src/global.css`.
- Firebase Auth: `AuthProvider`, `RequireAuth` e custom claims `role`/`status`. Os papéis existentes são `superAdmin`, `branchViewer` e `volunteer`. A administração atual pertence a superadministradores ativos.
- Firestore: serviços carregados sob demanda, regras fechadas por padrão e permissões por papel/filial. O projeto representa uma organização com filiais; não há um modelo de organizações/tenants independentes.
- Cloud Functions callable existentes em `southamerica-east1`, com Admin SDK para operações privilegiadas. O serviço `firebaseFunctions.js` já conecta ao emulador em desenvolvimento.
- Páginas públicas existentes: campanhas 2025/2026, relatório e contador de associados. Não havia modelos, campanhas de formulários ou convites públicos por token.
- Destinatários podem ser importados de `volunteers`, usando `listVolunteersPage`, sem consultar documentos pessoais e sem carregar a coleção inteira.
- Havia alterações anteriores em autenticação, regras, índices, serviços, páginas, configuração e documentos. Foram mantidas. Nos arquivos compartilhados, foram feitos apenas acréscimos específicos desta funcionalidade.

## Uso

1. Abra **Minha área → Formulários por link** como superadministrador ativo.
2. Crie um formulário em branco ou use um modelo. Edite título, descrição, instruções, validade, seções e perguntas. Seções e perguntas podem ser duplicadas, movidas ou excluídas com confirmação.
3. Marque a seção como repetível e personalize o botão, por exemplo, **Adicionar unidade**. Para seções fixas, mantenha a opção desmarcada e crie uma seção por unidade.
4. Confira a pré-visualização. Salve como modelo se desejar reutilizar. As edições temporárias ficam apenas na memória do navegador até salvar; sair/recarregar descarta edições não salvas.
5. Configure a campanha, o prazo e os destinatários, um por linha no formato `Nome; telefone`. O telefone pode ser omitido. A busca de voluntários é sob demanda, por prefixo exato do nome, com 25 itens por página.
6. Gere links individuais ou um link geral. O link geral pede o nome e cria uma solicitação individual. A mesma sessão de navegador retoma o token existente.
7. Na fila, copie o link ou a mensagem. **Abrir WhatsApp** usa `wa.me` com o texto preparado; o envio precisa ser confirmado manualmente no WhatsApp. Números de 10/11 dígitos recebem o prefixo 55. Sem telefone, é possível copiar mensagem e link.
8. Abra a resposta na própria fila para revisar os grupos de cada seção, aprovar, rejeitar, cancelar ou arquivar. Use o filtro de status e o botão de atualização para consultar dados recentes.

## Modelo de dados

```text
formAccounts/{uid}/templates/{templateId}
  title, archived, createdAt, updatedAt
  definition/current: definição reutilizável

formAccounts/{uid}/campaigns/{campaignId}
  title, description, formTitle, mode, createdAt, expiresAt,
  recipientCount, responseCount, archived, generalToken
  definition/snapshot: versão imutável usada no envio
  requests/{requestId}: name, phone, token, status, archived,
                        createdAt, submittedAt, reviewedBy, reviewedAt
  responses/{requestId}: answers, submittedAt, requestId

formTokens/{sha256(token)}
  ownerId, campaignId, kind, requestId (para links individuais)
```

Não há duplicação da definição nas solicitações. Listagens não carregam as definições nem as respostas. A definição de uma campanha não pode ser alterada pela API após sua criação. A reutilização do identificador de criação retorna a campanha existente, evitando duplicação em tentativas repetidas após falha de conexão.

Respostas usam `{ sectionId: [{ questionId: "valor" }, ...] }`. Cada elemento é um grupo repetível; uma seção fixa aceita exatamente um grupo. Os tipos permitidos são texto curto/longo, e-mail, telefone, CPF/CNPJ com dígitos verificadores, número, valor decimal, data, sim/não, seleção única por botões e lista de opções. Não há upload.

## Segurança e estados

- Gerenciamento exclusivo por `superAdmin` ativo, seguindo o papel administrativo existente. O escopo da conta vem do UID autenticado, nunca de um campo enviado pelo cliente. Administradores diferentes têm centrais independentes; não existe compartilhamento entre administradores nesta versão.
- As novas coleções negam leitura, listagem e escrita direta, inclusive a clientes autenticados. Toda operação usa `manageLinkForms` ou `publicLinkForms`. As regras existentes foram mantidas.
- Tokens individuais de 32 bytes aleatórios, gerados no servidor. O índice de resolução utiliza SHA-256. O token original fica acessível somente ao administrador dono da campanha, para a fila de envios.
- Resposta pública é transacional: relê campanha, solicitação, definição e resposta; exige link pendente, válido, não arquivado e dentro do prazo; valida campos; cria a resposta com o mesmo ID da solicitação; atualiza status e contador atomicamente. Duas chamadas concorrentes não conseguem criar duas respostas.
- A API pública devolve apenas a definição, o nome do destinatário e o prazo. Não devolve telefones, IDs de conta/campanha, outras solicitações, contadores ou respostas já enviadas. Campos adicionais e respostas a perguntas não configuradas são rejeitados.
- `EXPIRADA` é calculada a partir do prazo do servidor para solicitações pendentes, dispensando uma rotina de escrita em massa. O filtro equivalente é aplicado na consulta do banco. Arquivar campanha bloqueia respostas e apresenta seus links pendentes como cancelados. Respostas recebidas permanecem no histórico.
- Aprovação/rejeição não reabre o link e não altera o total de respostas recebidas. Cancelar uma solicitação respondida preserva sua resposta. Arquivar solicitação pendente exige antes cancelar ou expirar o link.
- Cabeçalhos do Hosting para `/formularios/**`: `X-Robots-Tag: noindex, nofollow, noarchive`, `Referrer-Policy: no-referrer`, `Cache-Control: no-store`. A página adiciona também as metatags correspondentes. Os cabeçalhos dependem de publicação futura da configuração.

## Limites e custo

| Item | Limite |
| --- | --- |
| Seções | 20 por formulário |
| Perguntas | 100 no total |
| Opções | 2 a 30 por pergunta de seleção |
| Repetições | 1 a 20 grupos por seção repetível |
| Destinatários/participantes | 200 por campanha |
| Texto longo | 4.000 caracteres por resposta |
| Demais respostas | 500 caracteres |
| Respostas completas | 100.000 caracteres serializados |
| Definição | 200.000 bytes UTF-8 |
| Validade padrão | 1 a 365 dias |
| Página administrativa | 25 registros e 1 registro sentinela |

Listagens usam cursores reais e filtros no banco, ordenados por ID de documento. Os contadores são persistidos; não se carregam todas as respostas para calculá-los. Não há listeners de formulários, polling ou gravações por edição do construtor. Os índices de estruturas volumosas de perguntas/respostas e tokens recuperados por ID foram desabilitados. Functions usam zero instâncias mínimas e no máximo duas instâncias, com concorrência 10.

## Validações

Resultado final em 10/09/2026: lint aprovado; 11 testes de domínio, 18 testes das regras existentes e 12 testes de integração aprovados (41 no total); build completo aprovado com o aviso de tamanho do SDK Firestore descrito abaixo.

- `npm run lint`
- `npm run test:domain`: testes de formulários e compatibilidade com os identificadores de acesso existentes.
- `npm run test:forms:emulated`: inicia Firestore/Storage locais, executa as regras existentes e a integração real da API de formulários. O teste de integração exige `FIRESTORE_EMULATOR_HOST` e não aceita rodar contra produção.
- `npm run build`

Cobertura dos 16 cenários solicitados:

| Cenário | Evidência automatizada |
| --- | --- |
| 1. Criação de formulário | Validação da definição e tipos, limites de seções/perguntas/opções |
| 2. Criação de modelo | Criar, editar, duplicar e arquivar no emulador |
| 3. Geração de campanha | Criação persistida, idempotência e snapshot imutável |
| 4–5. Tokens individuais diferentes | Formato de 256 bits, unicidade por destinatário |
| 6. Resposta pública válida | Persistência e incremento do contador em transação |
| 7. Campos não solicitados | Rejeição de perguntas, seções e campos extras; tentativa de alterar destinatário |
| 8. Segunda resposta | Chamadas simultâneas; apenas uma resposta/um incremento |
| 9. Link expirado | Bloqueio no envio e consulta de status |
| 10. Link cancelado | Bloqueio de solicitação cancelada e campanha arquivada |
| 11. Seção repetível | Grupos preservados, seção fixa não repetível e limite de 20 |
| 12. Limite de destinatários | Recusa de 201, sem gravação parcial; limite do link geral |
| 13. Isolamento | Outra conta não lista/lê/revisa; papéis sem permissão bloqueados; regras negam acesso direto |
| 14. WhatsApp | Texto personalizado, URL codificada e prefixo brasileiro |
| 15. Sem telefone | Telefone opcional e ausência de URL de WhatsApp |
| 16. Compatibilidade | Suíte existente de Firestore/Storage, testes de acesso, lint e build completo |

Verificação adicional no navegador, com dados fictícios e emuladores de Auth/Functions/Firestore/Storage: login administrativo, acesso pela dashboard, criação de modelo, pré-visualização, geração de dois destinatários, cópia de link, apresentação móvel em 390 × 844, resposta com duas unidades, confirmação, reabertura bloqueada, contador atualizado, revisão agrupada e aprovação. A fila para pessoa sem telefone foi conferida. Nenhuma mensagem de WhatsApp foi enviada.

## Limitações deliberadas

- Exportação fica para uma etapa futura; respostas e snapshots já estão separados para permitir implementação posterior.
- O link geral identifica por nome informado, sem autenticar a identidade. A garantia é uma resposta por token, não uma resposta por pessoa. Limpar o armazenamento do navegador ou usar outro dispositivo permite obter outro token, até o limite da campanha. Links individuais são apropriados para uma lista fechada.
- Para retomar um participante do link geral, o navegador precisa permitir armazenamento local. Não há proteção CAPTCHA ou App Check configurada; limite de participantes e limite de instâncias reduzem a escala, mas não substituem proteção contra abuso de um link geral divulgado amplamente.
- Não há envio automático nem confirmação de entrega/leitura do WhatsApp, conforme o escopo solicitado.
- Modelos temporários não são recuperados após recarregar a página; salve explicitamente como modelo.
- Não foram executados commit nem deploy. Para uso no ambiente publicado será necessário, mediante autorização, publicar as duas Functions, regras, índices e o frontend/Hosting em conjunto. O build reporta aviso de chunk do SDK Firestore acima de 500 kB.

## Arquivos desta implementação

Criados:

- `functions/formDomain.js`
- `functions/formDomain.test.js`
- `functions/formsApi.js`
- `functions/formsApi.integration.test.js`
- `functions/formsFunctions.js`
- `src/domain/forms/editorModel.js`
- `src/components/LinkForms/FormBuilder.jsx`
- `src/components/LinkForms/FormFields.jsx`
- `src/components/LinkForms/LinkForms.module.css`
- `src/pages/LinkFormsPage.jsx`
- `src/pages/PublicLinkFormPage.jsx`
- `src/services/linkFormsService.js`
- `docs/formularios-por-link.md`

Alterados:

- `functions/index.js`: exportação das duas novas Functions.
- `src/App.jsx`: rotas administrativa e pública com carregamento sob demanda.
- `src/pages/DashboardPage.jsx`: acesso à central.
- `firestore.rules`: negação explícita de acesso direto às novas coleções.
- `firestore.indexes.json`: índice da fila e isenções para dados volumosos/tokens.
- `firebase.json`: cabeçalhos de privacidade/não indexação.
- `package.json`: scripts de domínio e integração emulada.

O build regenerou `dist/`, que é ignorado pelo Git. Alterações locais anteriores nos demais arquivos não fazem parte desta implementação.
