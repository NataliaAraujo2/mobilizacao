// hooks/useVolunteers.js
import { useEffect, useState, useCallback } from "react";
import { db } from "../services/firebase";
import { collection, getDocs } from "firebase/firestore";

export function useVolunteers({ onlyApproved = false } = {}) {
  const [volunteers, setVolunteers] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchVolunteers = useCallback(async () => {
    setLoading(true);
    try {
      const snapshot = await getDocs(collection(db, "volunteers"));
      let data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

      if (onlyApproved) {
        data = data.filter((v) => v.statusCadastro === "approved");
      }

      setVolunteers(data);
    } catch (err) {
      console.error("❌ Erro ao carregar voluntários:", err);
    } finally {
      setLoading(false);
    }
  }, [onlyApproved]);

  useEffect(() => {
    fetchVolunteers();
  }, [fetchVolunteers]);

  return { volunteers, loading, reload: fetchVolunteers };
}
