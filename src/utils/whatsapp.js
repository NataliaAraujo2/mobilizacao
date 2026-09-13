export function whatsappUrl(phone, message) {
  const digits = String(phone ?? '').replace(/\D/g, '');
  if (!digits || !message) return null;
  const normalized = digits.startsWith('55') ? digits : `55${digits}`;
  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
}
