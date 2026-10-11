import { createRequire } from 'node:module';
import { join } from 'node:path';
import { planPhotoMigration, verifiedCopy } from './photoMigration.mjs';

// Migração pontual: usa a sessão existente do Firebase CLI, sem exportar tokens
// ou criar chaves de serviço. Por padrão, apenas inspeciona (--apply grava).
const args = process.argv.slice(2);
const project = args[args.indexOf('--project') + 1];
const bucket = args[args.indexOf('--bucket') + 1];
const apply = args.includes('--apply');
const verifyPublic = args.includes('--verify-public');
if (apply && verifyPublic) throw new Error('A verificação pública deve ser executada separadamente, sem --apply.');
if (!args.includes('--project') || !args.includes('--bucket') || project !== 'campanhamobilizacaomc'
  || bucket !== 'campanhamobilizacaomc.firebasestorage.app') {
  throw new Error('Informe explicitamente o projeto e o bucket de produção autorizados.');
}
const cliPath = process.env.FIREBASE_CLI_PACKAGE || join(process.env.APPDATA || '', 'npm', 'node_modules', 'firebase-tools', 'package.json');
const cliRequire = createRequire(cliPath);
const cliAuth = cliRequire('./lib/auth.js');
const account = cliAuth.getProjectDefaultAccount(process.cwd());
if (!account?.tokens?.refresh_token) throw new Error('Entre na conta correta com firebase login antes de executar a migração.');

async function request(url, options = {}) {
  const token = await cliAuth.getAccessToken(account.tokens.refresh_token, ['https://www.googleapis.com/auth/cloud-platform']);
  const response = await fetch(url, { ...options, signal: AbortSignal.timeout(60000), headers: {
    Authorization: `Bearer ${token.access_token}`, 'Content-Type': 'application/json', ...options.headers,
  } });
  const data = await response.json();
  if (!response.ok) {
    const error = new Error(`Operação recusada pela API (HTTP ${response.status}).`);
    error.status = response.status;
    throw error;
  }
  return data;
}

const storageBase = `https://storage.googleapis.com/storage/v1/b/${encodeURIComponent(bucket)}/o/`;
const storage = {
  metadata: path => request(storageBase + encodeURIComponent(path)),
  async copy(from, to, sourceGeneration) {
    const url = new URL(`${storageBase}${encodeURIComponent(from)}/copyTo/b/${encodeURIComponent(bucket)}/o/${encodeURIComponent(to)}`);
    url.searchParams.set('ifSourceGenerationMatch', sourceGeneration);
    url.searchParams.set('ifGenerationMatch', '0');
    try { await request(url, { method: 'POST', body: '{}' }); }
    catch (error) { if (error.status !== 412) throw error; }
    // Destino existente nunca é sobrescrito; verifiedCopy compara o conteúdo.
  },
};

const firestoreBase = `https://firestore.googleapis.com/v1/projects/${project}/databases/(default)/documents`;
const summary = { mode: apply ? 'apply' : 'dry-run', actions: 0, plannedPhotos: 0, copiedPhotos: 0, updatedActions: 0, invalidPaths: 0, failedActions: 0 };
if (verifyPublic) Object.assign(summary, { publicPhotosChecked: 0, publicPhotosFailed: 0 });
let pageToken = '';
do {
  const pageUrl = new URL(`${firestoreBase}/actions`);
  pageUrl.searchParams.set('pageSize', '100');
  if (pageToken) pageUrl.searchParams.set('pageToken', pageToken);
  const page = await request(pageUrl);
  for (const document of page.documents || []) {
    summary.actions += 1;
    if (verifyPublic) {
      for (const field of ['photosBefore', 'photosDuring', 'photosAfter']) {
        for (const photo of document.fields?.[field]?.arrayValue?.values || []) {
          summary.publicPhotosChecked += 1;
          try {
            const path = photo.mapValue?.fields?.path?.stringValue;
            if (!path) throw new Error('Foto sem caminho.');
            // Mesmo endpoint público usado pelo getDownloadURL da galeria,
            // deliberadamente sem credenciais administrativas.
            const response = await fetch(`https://firebasestorage.googleapis.com/v0/b/${encodeURIComponent(bucket)}/o/${encodeURIComponent(path)}`, { signal: AbortSignal.timeout(60000) });
            if (!response.ok) throw new Error('Foto indisponível ao público.');
            const metadata = await response.json();
            if (metadata.contentType !== 'image/webp' || !metadata.downloadTokens || metadata.name !== path) throw new Error('Metadados públicos inválidos.');
          } catch {
            summary.publicPhotosFailed += 1;
            console.error(`Ação ${document.name.split('/').at(-1)}: foto indisponível na verificação pública.`);
          }
        }
      }
    }
    const plan = planPhotoMigration(document);
    summary.plannedPhotos += plan.copies.length;
    summary.invalidPaths += plan.skipped;
    if (!Object.keys(plan.fields).length) continue;
    try {
      for (const copy of plan.copies) {
        if (apply) {
          await verifiedCopy(copy, storage);
          summary.copiedPhotos += 1;
        } else {
          const metadata = await storage.metadata(copy.from);
          if (metadata.contentType !== 'image/webp' || Number(metadata.size) <= 0 || !metadata.md5Hash) throw new Error('Imagem original inválida.');
        }
      }
      if (apply) {
        const url = new URL(`https://firestore.googleapis.com/v1/${document.name}`);
        const fields = { ...plan.fields, updatedAt: { timestampValue: new Date().toISOString() } };
        for (const field of Object.keys(fields)) url.searchParams.append('updateMask.fieldPaths', field);
        // Interrompe a atualização se outra pessoa tiver editado a ação.
        url.searchParams.set('currentDocument.updateTime', document.updateTime);
        await request(url, { method: 'PATCH', body: JSON.stringify({ fields }) });
        summary.updatedActions += 1;
        console.log(`Ação ${document.name.split('/').at(-1)}: referências atualizadas (${plan.copies.length} fotos).`);
      }
    } catch (error) {
      summary.failedActions += 1;
      console.error(`Ação ${document.name.split('/').at(-1)}: não alterada. ${error.message}`);
    }
  }
  pageToken = page.nextPageToken || '';
} while (pageToken);
console.log(JSON.stringify(summary));
console.log('Os arquivos originais foram preservados. Nenhuma foto foi excluída.');
if (summary.failedActions || summary.invalidPaths || summary.publicPhotosFailed) process.exitCode = 1;
