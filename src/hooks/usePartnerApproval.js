import { useEffect, useState, useCallback } from "react";
import { db } from "../services/firebase";
import { collection, getDocs, updateDoc, doc } from "firebase/firestore";
import { useAuth } from "./useAuth";

export function usePartnerApproval() {
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);
  const { permissions, scope } = useAuth();

  const canApproveNacional = permissions.includes("partners_approve_nacional");
  const canApproveEstadual = permissions.includes("partners_approve_estadual");
  const canApproveMunicipal = permissions.includes(
    "partners_approve_municipal"
  );

  const fetchPending = useCallback(async () => {
    setLoading(true);
    try {
      const snapshot = await getDocs(collection(db, "partners"));
      let data = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      }));

      // 🔹 apenas quem tem algum status pendente
      data = data.filter(
        (p) => p.statusCadastro === "pending" || p.statusLogo === "pending"
      );

      // 🔹 restrições de escopo
      if (canApproveMunicipal && scope?.municipio) {
        data = data.filter((p) => p.municipio === scope.municipio);
      } else if (canApproveEstadual && scope?.estado) {
        data = data.filter((p) => String(p.estado) === String(scope.estado));
      }

      setPartners(data);
    } catch (err) {
      console.error("❌ Erro ao buscar parceiros pendentes:", err);
    } finally {
      setLoading(false);
    }
  }, [canApproveMunicipal, canApproveEstadual, scope]);

  useEffect(() => {
    fetchPending();
  }, [fetchPending]);

  // 🔹 Aprovação de cadastro
  const approveCadastro = async (id) => {
    await updateDoc(doc(db, "partners", id), { statusCadastro: "approved" });
    fetchPending();
  };

  const rejectCadastro = async (id, reason, pendente = true) => {
    await updateDoc(doc(db, "partners", id), {
      statusCadastro: pendente ? "rejected_pending" : "rejected",
      rejectionReason: reason,
    });
    fetchPending();
  };

  // 🔹 Aprovação de logo
  const approveLogo = async (id) => {
    await updateDoc(doc(db, "partners", id), { statusLogo: "approved" });
    fetchPending();
  };

  const rejectLogo = async (id, reason, pendente = true) => {
    await updateDoc(doc(db, "partners", id), {
      statusLogo: pendente ? "rejected_pending" : "rejected",
      rejectionReasonLogo: reason,
    });
    fetchPending();
  };

  return {
    partners,
    loading,
    reload: fetchPending,
    approveCadastro,
    rejectCadastro,
    approveLogo,
    rejectLogo,
    canApproveNacional,
    canApproveEstadual,
    canApproveMunicipal,
  };
}
