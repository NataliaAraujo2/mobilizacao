export async function documentLinkToken(id) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(id));
  return Array.from(new Uint8Array(digest).slice(0, 12), byte => byte.toString(16).padStart(2, '0')).join('');
}

export function isPublicDocumentUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && url.hostname === 'firebasestorage.googleapis.com'
      && url.pathname.startsWith('/v0/b/') && url.searchParams.get('alt') === 'media';
  } catch { return false; }
}

export function documentShortUrl(token) {
  return `${window.location.origin}/d/${token}`;
}
