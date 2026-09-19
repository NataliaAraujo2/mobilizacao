const EMAIL_SIGNATURE = "ONG Moradia e Cidadania\nCriada pelos empregados da CAIXA\n@moradiaecidadania.nacional";

export function gmailComposeUrl(to, subject, body) {
  const recipient = String(to ?? "").trim();
  if (!recipient) return null;

  const message = `${String(body ?? "").trim()}\n\n${EMAIL_SIGNATURE}`;
  const params = new URLSearchParams({ view: "cm", fs: "1", to: recipient, su: subject, body: message });
  return `https://mail.google.com/mail/?${params.toString()}`;
}
