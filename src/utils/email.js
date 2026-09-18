export function gmailComposeUrl(to, subject, body) {
  const recipient = String(to ?? "").trim();
  if (!recipient) return null;

  const params = new URLSearchParams({ view: "cm", fs: "1", to: recipient, su: subject, body });
  return `https://mail.google.com/mail/?${params.toString()}`;
}
