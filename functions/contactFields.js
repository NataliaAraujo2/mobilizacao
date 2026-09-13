// Shared by the browser and Cloud Functions; no environment-specific dependencies.
export function normalizePhone(value) { return String(value ?? '').replace(/\D/g, ''); }
export function normalizeEmail(value) { return String(value ?? '').trim().toLowerCase(); }
export function normalizeSearchText(value) {
  return String(value ?? '').trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR');
}
export function isValidEmail(value) {
  const email = normalizeEmail(value);
  return email.length <= 254 && /^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/.test(email);
}
export function isValidPhone(value, maxDigits = 15) {
  const text = String(value ?? '').trim();
  const size = normalizePhone(text).length;
  return /^[+\d().\s-]+$/.test(text) && size >= 10 && size <= maxDigits;
}
export function formatPhone(value) {
  const text = String(value ?? '');
  const digits = normalizePhone(text);
  if (!digits) return '';
  const brazilCode = digits.startsWith('55') && (text.startsWith('+55') || digits.length === 12 || digits.length === 13);
  if ((text.startsWith('+') && !brazilCode) || (!brazilCode && digits.length > 11)) return `${text.startsWith('+') ? '+' : ''}${digits}`;
  const local = brazilCode ? digits.slice(2) : digits;
  const prefix = brazilCode ? '+55 ' : '';
  if (!local) return '+55';
  if (local.length <= 2) return `${prefix}(${local}`;
  const split = local.length > 10 ? 7 : 6;
  return `${prefix}(${local.slice(0, 2)}) ${local.slice(2, split)}${local.length > split ? '-' + local.slice(split) : ''}`;
}
