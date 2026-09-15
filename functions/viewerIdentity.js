export function nextBranchViewerUsername(code, state, existingUsernames = [], reservedUsernames = []) {
  const safeCode = String(code ?? "").trim().toUpperCase().replace(/[^A-Z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  const baseUsername = `USUARIO_${safeCode || "COORDENACAO"}_${String(state ?? "").trim().toUpperCase()}`;
  const unavailable = new Set([...existingUsernames, ...reservedUsernames]);
  let suffix = 1;
  let username = baseUsername;
  while (unavailable.has(username)) {
    suffix += 1;
    username = `${baseUsername}_${String(suffix).padStart(2, "0")}`;
  }
  return username;
}
