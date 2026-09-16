export function nextBranchViewerUsername(code, state, existingUsernames = [], reservedUsernames = []) {
  const safeState = String(state ?? "").trim().toUpperCase().replace(/[^A-Z]/g, "");
  const safeCode = String(code ?? "").trim().toUpperCase();
  if (!safeState) throw new Error("Informe a UF da coordenação estadual.");
  const codeMatch = safeCode.match(new RegExp(`^${safeState}(?:[_-]?(\\d+))?$`));
  const coordinationNumber = Number(codeMatch?.[1] ?? 1);
  const base = `USUARIO-${safeState}-${String(coordinationNumber).padStart(2, "0")}`;
  const unavailable = new Set([...existingUsernames, ...reservedUsernames].map((username) => String(username).toUpperCase()));
  let userNumber = 1;
  let username = `${base}-${String(userNumber).padStart(2, "0")}`;
  while (unavailable.has(username)) {
    userNumber += 1;
    username = `${base}-${String(userNumber).padStart(2, "0")}`;
  }
  return { username, coordinationNumber, userNumber };
}
