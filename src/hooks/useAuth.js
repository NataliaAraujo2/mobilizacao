import { useContext } from "react";
import { AuthContext } from "../contexts/AuthContext.jsx"; // ✅ agora é nomeado

export function useAuth() {
  return useContext(AuthContext);
}
