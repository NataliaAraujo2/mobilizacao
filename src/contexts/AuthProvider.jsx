import { useState, useEffect } from "react";
import { auth, db } from "../services/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth"; // 🔹 import signOut
import { doc, getDoc } from "firebase/firestore";
import { AuthContext } from "./AuthContext";
import { permissionsBase, permissionsProfiles } from "../config/permissionsMap";

// 🔹 resolve permissões do usuário
function getUserPermissions(user) {
  if (!user) return [];

  if (user.role === "presidente") {
    return permissionsProfiles.presidente.allPermissions;
  }

  if (user.role === "coordenador_estadual") {
    return permissionsProfiles.coordenador_estadual.allPermissions;
  }

  if (user.role === "financeiro_nacional") {
    return permissionsProfiles.financeiro_nacional.allPermissions;
  }

  // Caso comum: pega pelo nível de escopo + posição
  const nivel = user.scope?.nivel; // municipal | estadual | nacional
  if (!nivel) return [];

  const escopo = permissionsBase[nivel];
  if (!escopo) return [];

  const grupo = escopo[user.position] || escopo.geral || [];
  return grupo;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [permissions, setPermissions] = useState([]);
  const [scope, setScope] = useState(null);
  const [position, setPosition] = useState(null);
  const [profileId, setProfileId] = useState(null);
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true);

      if (firebaseUser) {
        setUser(firebaseUser);

        try {
          const userRef = doc(db, "users", firebaseUser.uid);
          const userSnap = await getDoc(userRef);

          if (userSnap.exists()) {
            const userData = userSnap.data();

            const normalizedScope = {
              nivel: userData.scope?.nivel || userData.scope || null,
              estado: userData.scope?.estado ? String(userData.scope.estado) : null,
              municipio: userData.scope?.municipio || null,
            };
            setScope(normalizedScope);

            setPosition(userData.position || null);
            setProfileId(userData.profileId || null);

            // 🔹 resolve permissões aqui
            const perms = getUserPermissions({
              role: userData.role,
              scope: normalizedScope,
              position: userData.position,
            });
            setPermissions(perms);

            // 🔹 perfil vinculado
            if (normalizedScope.nivel && userData.profileId) {
              try {
                const profileRef = doc(db, `${normalizedScope.nivel}s`, userData.profileId);
                const profileSnap = await getDoc(profileRef);
                setProfileData(profileSnap.exists() ? profileSnap.data() : null);
              } catch (err) {
                console.error("❌ Erro ao carregar perfil:", err);
                setProfileData(null);
              }
            } else {
              setProfileData(null);
            }
          } else {
            setPermissions([]);
            setScope(null);
            setPosition(null);
            setProfileId(null);
            setProfileData(null);
          }
        } catch (err) {
          console.error("❌ Erro ao carregar dados do usuário:", err);
          setPermissions([]);
          setScope(null);
          setPosition(null);
          setProfileId(null);
          setProfileData(null);
        }
      } else {
        setUser(null);
        setPermissions([]);
        setScope(null);
        setPosition(null);
        setProfileId(null);
        setProfileData(null);
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // 🔹 função de logout
  const logout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error("❌ Erro ao fazer logout:", err);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        permissions,
        scope,
        position,
        profileId,
        profileData,
        loading,
        logout, // 🔹 agora disponível no contexto
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
