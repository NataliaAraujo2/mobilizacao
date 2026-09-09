import { USER_ROLES, USER_STATUSES } from "../access/access";

export function createUserProfile({ displayName, email, role, branchId = null, status = USER_STATUSES.PENDING }) {
  if (role !== USER_ROLES.SUPER_ADMIN && !branchId) {
    throw new Error("Usuários vinculados precisam de uma filial.");
  }

  return {
    displayName: displayName.trim(),
    email: email.trim().toLowerCase(),
    role,
    branchId: role === USER_ROLES.SUPER_ADMIN ? null : branchId,
    status,
    createdAt: null,
    updatedAt: null,
  };
}
