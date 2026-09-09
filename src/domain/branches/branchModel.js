import { BRANCH_STATUSES } from "../access/access";
import { isBrazilStateCode } from "../locations/brazilStates";

export function createBranch({ name, code, state, status = BRANCH_STATUSES.ACTIVE }) {
  const normalizedState = state.trim().toUpperCase();
  if (!isBrazilStateCode(normalizedState)) throw new Error("Selecione um estado válido.");
  return {
    name: name.trim(),
    code: code.trim().toUpperCase(),
    state: normalizedState,
    status,
    createdAt: null,
    updatedAt: null,
  };
}
