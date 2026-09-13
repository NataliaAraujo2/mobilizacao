export function nextBranchViewerUsername(state, existingUsernames = [], reservedUsernames = []) {
  const baseUsername = `USUARIO_${state}`;
  const unavailable = new Set([...existingUsernames, ...reservedUsernames]);
  let suffix = 1;
  let username = baseUsername;
  while (unavailable.has(username)) {
    suffix += 1;
    username = `${baseUsername}_${String(suffix).padStart(2, "0")}`;
  }
  return username;
}
