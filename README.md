# Mobilização

Base reiniciada em React com JavaScript, CSS Modules e Firebase. O mapa interativo do Brasil foi preservado.

## Comandos

- `npm install`
- `npm run dev`
- `npm run lint`
- `npm run build`

O mapa não consulta o Firebase. Serviços de Auth, Firestore e Storage permanecem em `src/services` e devem ser carregados somente quando uma funcionalidade precisar deles.

## Ambientes Firebase

- `dev`: `campanha-mobilizacao-dev` (ambiente padrão)
- `prod`: `campanhamobilizacaomc` (site atual)

O desenvolvimento local usa `.env.development.local`, que não é versionado. Os comandos de deploy exigem a escolha explícita entre `deploy:dev` e `deploy:prod`; não existe um comando genérico de deploy.

## Emuladores locais

Execute `npm run emulators` e, em outro terminal, `npm run dev`. A interface dos emuladores estará em `http://127.0.0.1:4000`.

- Authentication: porta 9099
- Firestore: porta 8080
- Storage: porta 9199

Use `npm run emulators:save` para preservar dados fictícios entre sessões. As regras iniciais negam todas as operações até implementarmos e testarmos os perfis de acesso.

Com os emuladores ativos, execute `npm run seed:superadmin` para criar a conta fictícia local:

- E-mail: `superadmin@example.test`
- Senha: `DevOnly123!`

Essa conta e suas permissões existem somente nos emuladores.
