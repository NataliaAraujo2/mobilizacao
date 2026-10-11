export function publicCoordinationMetadata(branch) {
  return { name: branch.name, state: branch.state, status: branch.status };
}

export function normalizeCoordinationContacts(input) {
  const phone = String(input.phone ?? '').replace(/\D/g, '');
  const email = String(input.email ?? '').trim().toLowerCase();
  if (phone && !/^\d{10,13}$/.test(phone)) throw new Error('Informe um telefone institucional válido.');
  if (email && (email.length > 160 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) throw new Error('Informe um e-mail institucional válido.');
  return { phone, email };
}
