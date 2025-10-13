// utils/withPermission.js
import React from "react";
import { useAuth } from "../hooks/useAuth";

export function withPermission(Component, { requiredPermissions = [], requireAll = false, condition = null }) {
  return function Wrapper(props) {
    const { permissions, scope, profileData } = useAuth();

    const hasPermissions = requiredPermissions.length === 0
      ? true
      : requireAll
        ? requiredPermissions.every((p) => permissions.includes(p))
        : requiredPermissions.some((p) => permissions.includes(p));

    const passesCondition = condition ? condition({ ...props, scope, profileData }) : true;

    if (!hasPermissions || !passesCondition) return null;

    return <Component {...props} />;
  };
}
