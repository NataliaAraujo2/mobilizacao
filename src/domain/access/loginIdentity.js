const VIEWER_EMAIL_DOMAIN = "acesso.mobilizacao.invalid";

export function resolveLoginIdentity(value) {
  const identity = value.trim();
  if (identity.includes("@")) return identity.toLowerCase();
  return `${identity.toLowerCase()}@${VIEWER_EMAIL_DOMAIN}`;
}

