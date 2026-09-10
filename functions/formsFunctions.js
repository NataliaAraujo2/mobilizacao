import { getFirestore } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { createFormsApi } from './formsApi.js';
import { FormValidationError } from './formDomain.js';

const options = { region: 'southamerica-east1', minInstances: 0, maxInstances: 2, concurrency: 10, timeoutSeconds: 60 };
async function invoke(operation) {
  try { return await operation(createFormsApi(getFirestore())); }
  catch (error) {
    // Infrastructure details and document paths must never leak into public responses.
    if (error instanceof FormValidationError) throw new HttpsError('failed-precondition', error.message);
    throw new HttpsError('internal', 'Não foi possível concluir. Tente novamente.');
  }
}
export const manageLinkForms = onCall(options, request => invoke(api => api.manage(request.auth, request.data)));
export const publicLinkForms = onCall(options, request => invoke(api => api.public(request.data)));
