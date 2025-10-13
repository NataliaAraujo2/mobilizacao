// hooks/useVolunteerApproval.js
import { useEffect, useState, useCallback } from "react";
import { db } from "../services/firebase";
import { collection, getDocs, updateDoc, doc } from "firebase/firestore";
import { useAuth } from "./useAuth";

export function useVolunteerApproval() {
  const [volunteers, setVolunteers] = useState([]);
  const [loading, setLoading] = useState(true);
  const { permissions, scope } = useAuth();

  const canApproveNacional = permissions.includes("volunteers_approve_nacional");
  const canApproveEstadual = permissions.includes("volunteers_approve_estadual");
  const canApproveMunicipal = permissions.includes("volunteers_approve_municipal");

  const fetchPending = useCallback(async () => {
    setLoading(true);
    try {
      const snapshot = await getDocs(collection(db, "volunteers"));
      let data = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));

      data = data.filter((v) => v.statusCadastro === "pending");

      if (canApproveMunicipal && scope) {
        data = data.filter((v) => v.municipio === scope);
      } else if (canApproveEstadual && scope) {
        data = data.filter((v) => v.estado === scope);
      }

      setVolunteers(data);
    } catch (err) {
      console.error("❌ Erro ao buscar voluntários pendentes:", err);
    } finally {
      setLoading(false);
    }
  }, [canApproveMunicipal, canApproveEstadual, scope]);

  useEffect(() => {
    fetchPending();
  }, [fetchPending]);

  const approveVolunteer = async (id) => {
    await updateDoc(doc(db, "volunteers", id), { statusCadastro: "approved" });
    setVolunteers((prev) => prev.filter((v) => v.id !== id));
  };

  const rejectVolunteer = async (id) => {
    await updateDoc(doc(db, "volunteers", id), { statusCadastro: "rejected" });
    setVolunteers((prev) => prev.filter((v) => v.id !== id));
  };

  return { volunteers, loading, reload: fetchPending, approveVolunteer, rejectVolunteer,     canApproveNacional,
    canApproveEstadual,
    canApproveMunicipal, };
}
