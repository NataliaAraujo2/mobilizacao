export function nextBranchViewerUsername(code, state, existingUsernames = [], reservedUsernames = []) {
  const safeState = String(state ?? "").trim().toUpperCase().replace(/[^A-Z]/g, "");
  if (!safeState) throw new Error("Informe a UF da coordenação estadual.");
  const unavailable = new Set([...existingUsernames, ...reservedUsernames]);
  // Contas antigas também entram na sequência da UF para que a numeração
  // represente a quantidade de coordenações já cadastradas naquele estado.
  const stateSuffix = new RegExp(`_${safeState}(?:_\\d{2,})?$`);
  const accountsInState = [...unavailable].filter((username) => stateSuffix.test(String(username).toUpperCase())).length;
  let sequence = accountsInState + 1;
  let username = `USUARIO_${String(sequence).padStart(2, "0")}_${safeState}`;
  while (unavailable.has(username)) {
    sequence += 1;
    username = `USUARIO_${String(sequence).padStart(2, "0")}_${safeState}`;
  }
  return username;
}
