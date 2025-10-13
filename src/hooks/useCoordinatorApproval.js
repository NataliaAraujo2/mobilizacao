// src/hooks/useCoordinatorApproval.js
import { useEffect, useState, useCallback } from "react";
import { db } from "../services/firebase";
import { collection, getDocs, updateDoc, doc } from "firebase/firestore";
import { useAuth } from "./useAuth";

export function useCoordinatorApproval() {
  const [coordinators, setCoordinators] = useState([]);
  const [loading, setLoading] = useState(true);
  const { permissions, scope } = useAuth();

  const canApproveNacional = permissions.includes("coordinators_approve_nacional");
  const canApproveEstadual = permissions.includes("coordinators_approve_estadual");
  const canApproveMunicipal = permissions.includes("coordinators_approve_municipal");

  const fetchPending = useCallback(async () => {
    setLoading(true);
    try {
      const snapshot = await getDocs(collection(db, "coordinators"));
      let data = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      }));

      data = data.filter((c) => c.statusCadastro === "pending");

      if (canApproveMunicipal && scope?.municipio) {
        data = data.filter((c) => c.municipio === scope.municipio);
      } else if (canApproveEstadual && scope?.estado) {
        data = data.filter((c) => String(c.estado) === String(scope.estado));
      }

      setCoordinators(data);
    } catch (err) {
      console.error("❌ Erro ao buscar coordenadores pendentes:", err);
    } finally {
      setLoading(false);
    }
  }, [canApproveMunicipal, canApproveEstadual, scope]);

  useEffect(() => {
    fetchPending();
  }, [fetchPending]);

  const approveCoordinator = async (id) => {
    await updateDoc(doc(db, "coordinators", id), { statusCadastro: "approved" });
    setCoordinators((prev) => prev.filter((c) => c.id !== id));
  };

  const rejectCoordinator = async (id) => {
    await updateDoc(doc(db, "coordinators", id), { statusCadastro: "rejected" });
    setCoordinators((prev) => prev.filter((c) => c.id !== id));
  };

  return {
    coordinators,
    loading,
    reload: fetchPending,
    approveCoordinator,
    rejectCoordinator,
    canApproveNacional,
    canApproveEstadual,
    canApproveMunicipal,
  };
}
