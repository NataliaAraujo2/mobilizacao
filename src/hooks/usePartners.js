import { useEffect, useState } from "react";
import { db } from "../services/firebase";
import {
  collection,
  addDoc,
  updateDoc,
  getDoc,  
  doc,
  serverTimestamp,
  onSnapshot,
  query,
} from "firebase/firestore";

export function usePartners({ onlyApproved = false, checkLogo = false } = {}) {
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, "partners"));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        let data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

        if (onlyApproved) {
          data = data.filter((p) => p.statusCadastro === "approved");
        }
        if (checkLogo) {
          data = data.filter((p) => p.statusLogo === "approved");
        }

        // 🔹 Ordena por nome antes de salvar
        data.sort((a, b) => a.name.localeCompare(b.name));

        setPartners(data);
        setLoading(false);
      },
      (error) => {
        console.error("❌ Erro ao carregar parceiros:", error);
        setLoading(false);
      }
    );

    return () => unsubscribe(); // 🔹 limpa ao desmontar
  }, [onlyApproved, checkLogo]);

  // 🔹 Criar novo parceiro (com defaults)
  const createPartner = async (partnerData) => {
    const ref = await addDoc(collection(db, "partners"), {
      ...partnerData,
      statusCadastro: "pending",
      statusLogo: "pending",
      logoPath: null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return ref.id;
  };

  // 🔹 Editar parceiro existente (somente campos enviados)
  const updatePartner = async (id, partnerData) => {
    const ref = doc(db, "partners", id);
    await updateDoc(ref, {
      ...partnerData,
      updatedAt: serverTimestamp(),
    });
  };

  // 🔹 Buscar parceiro por ID
  const getPartnerById = async (id) => {
    const ref = doc(db, "partners", id);
    const snap = await getDoc(ref);
    return snap.exists() ? { id: snap.id, ...snap.data() } : null;
  };

  return {
    partners,
    loading,
    createPartner,
    updatePartner,
    getPartnerById,
  };
}
