import { getFunctionsService } from './firebaseFunctions';

async function call(name, data) {
  const { functions, httpsCallable } = await getFunctionsService();
  try {
    const result = await httpsCallable(functions, name)(data);
    return result.data;
  } catch (error) {
    const message = error.code === 'functions/failed-precondition'
      ? error.message.replace(/\s*\[\d{3}\]$/, '')
      : 'Não foi possível concluir. Verifique sua conexão e tente novamente.';
    throw new Error(message);
  }
}
export const manageForms = (action, data = {}) => call('manageLinkForms', { ...data, action });
export const publicForms = (action, data = {}) => call('publicLinkForms', { ...data, action });
export const formLink = token => `${window.location.origin}/formularios/${token}`;
