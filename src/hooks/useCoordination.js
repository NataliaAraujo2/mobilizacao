import { useEffect, useState, useCallback } from "react";
import { db } from "../services/firebase";
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  doc,
  serverTimestamp,
  onSnapshot,
  query,
  orderBy,
  where,
  getDocs,
} from "firebase/firestore";
import brazilStates from "../utils/brazilStates";

export function useCoordination() {
  const [coordinations, setCoordinations] = useState([]);
  const [loading, setLoading] = useState(true);

  const [status, setStatus] = useState({
    create: "idle",
    update: "idle",
    delete: "idle",
    fetch: "idle",
    error: null,
    message: null,
  });

  // 🔹 Validar se o estado é válido
  const isValidState = (state) => {
    return brazilStates.some(
      (s) => s.name.toLowerCase() === state.toLowerCase() || s.code.toUpperCase() === state.toUpperCase()
    );
  };

  // 🔹 Carregar todas as coordenações em tempo real
  useEffect(() => {
    setStatus((s) => ({ ...s, fetch: "loading" }));
    const q = query(collection(db, "coordinations"), orderBy("state"));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        setCoordinations(data);
        setLoading(false);
        setStatus((s) => ({ ...s, fetch: "success", error: null }));
      },
      (error) => {
        console.error("❌ Erro ao carregar coordenações:", error);
        setLoading(false);
        setStatus((s) => ({ ...s, fetch: "error", error: error.message }));
      }
    );

    return () => unsubscribe();
  }, []);

  // 🔹 Resetar status automaticamente após um tempo (default 3s)
  const resetStatus = useCallback((delay = 3000) => {
    setTimeout(() => {
      setStatus((s) => ({
        create: "idle",
        update: "idle",
        delete: "idle",
        fetch: s.fetch,
        error: null,
        message: null,
      }));
    }, delay);
  }, []);

  // 🔹 Criar nova coordenação
  const createCoordination = async (coordData) => {
    setStatus((s) => ({ ...s, create: "loading", error: null, message: null }));

    try {
      if (!coordData.state || !isValidState(coordData.state)) {
        throw new Error(`Estado inválido: ${coordData.state}`);
      }

      const existing = coordinations.find((c) => c.state.toLowerCase() === coordData.state.toLowerCase());
      if (existing) {
        throw new Error(`Coordenação para o estado ${coordData.state} já existe.`);
      }

      const dataToSave = {
        ...coordData,
        projetos: coordData.projetos || [],
        team: coordData.team || [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      const ref = await addDoc(collection(db, "coordinations"), dataToSave);

      setCoordinations((prev) => [...prev, { id: ref.id, ...dataToSave }]);
      setStatus((s) => ({ ...s, create: "success", message: "Coordenação criada com sucesso!" }));
      resetStatus();

      return ref.id;
    } catch (error) {
      setStatus((s) => ({ ...s, create: "error", error: error.message }));
      resetStatus();
      throw error;
    }
  };

  // 🔹 Atualizar coordenação existente
  const updateCoordination = async (id, coordData) => {
    setStatus((s) => ({ ...s, update: "loading", error: null, message: null }));

    try {
      if (coordData.state && !isValidState(coordData.state)) {
        throw new Error(`Estado inválido: ${coordData.state}`);
      }

      const ref = doc(db, "coordinations", id);
      const dataToUpdate = { ...coordData, updatedAt: serverTimestamp() };
      await updateDoc(ref, dataToUpdate);

      setCoordinations((prev) =>
        prev.map((coord) => (coord.id === id ? { ...coord, ...dataToUpdate } : coord))
      );

      setStatus((s) => ({ ...s, update: "success", message: "Coordenação atualizada com sucesso!" }));
      resetStatus();
    } catch (error) {
      setStatus((s) => ({ ...s, update: "error", error: error.message }));
      resetStatus();
      throw error;
    }
  };

  // 🔹 Deletar coordenação
  const deleteCoordination = async (id) => {
    setStatus((s) => ({ ...s, delete: "loading", error: null, message: null }));

    try {
      const ref = doc(db, "coordinations", id);
      await deleteDoc(ref);

      setCoordinations((prev) => prev.filter((coord) => coord.id !== id));

      setStatus((s) => ({ ...s, delete: "success", message: "Coordenação deletada com sucesso!" }));
      resetStatus();
    } catch (error) {
      setStatus((s) => ({ ...s, delete: "error", error: error.message }));
      resetStatus();
      throw error;
    }
  };

// 🔹 Buscar coordenação por ID
const getCoordinationById = useCallback(async (id) => {
  const ref = doc(db, "coordinations", id);
  const snap = await getDoc(ref);
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}, []);

  // 🔹 Buscar coordenação por estado
  const getCoordinationByState = useCallback(
    async (state) => {
      if (!isValidState(state)) return null;
      const q = query(collection(db, "coordinations"), where("state", "==", state));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const docData = snap.docs[0];
        return { id: docData.id, ...docData.data() };
      }
      return null;
    },
    []
  );

  // 🔹 Buscar coordenação com projetos populados
  const getCoordinationWithProjects = useCallback(
    async (id) => {
      const coordination = await getCoordinationById(id);
      if (!coordination) return null;

      // Se não houver projetos, retorna apenas a coordenação
      if (!coordination.projetos || coordination.projetos.length === 0) return { ...coordination, projetos: [] };

      const projectsPromises = coordination.projetos.map(async (projId) => {
        const projRef = doc(db, "projects", projId);
        const projSnap = await getDoc(projRef);
        return projSnap.exists() ? { id: projSnap.id, ...projSnap.data() } : null;
      });

      const projects = await Promise.all(projectsPromises);
      return { ...coordination, projetos: projects.filter(Boolean) };
    },
    [getCoordinationById]
  );

 // 🔹 Remover membro específico da equipe (Firestore + estado local)
const removeTeamMember = async (coordinationId, member) => {
  setStatus((s) => ({ ...s, update: "loading", error: null, message: null }));

  try {
    const ref = doc(db, "coordinations", coordinationId);

    // 🔸 Busca a coordenação localmente
    const coord = coordinations.find((c) => c.id === coordinationId);
    if (!coord) throw new Error("Coordenação não encontrada.");

    // 🔸 Cria um novo array sem o membro removido
    const newTeam = coord.team.filter((m) => m.nome !== member.nome);

    // 🔸 Atualiza no Firestore
    await updateDoc(ref, { team: newTeam });

    // 🔸 Atualiza no estado local
    setCoordinations((prev) =>
      prev.map((c) => (c.id === coordinationId ? { ...c, team: newTeam } : c))
    );

    setStatus((s) => ({
      ...s,
      update: "success",
      message: `Membro "${member.nome}" removido com sucesso.`,
    }));
    resetStatus();

    return newTeam; // ✅ Retorna o novo time atualizado
  } catch (error) {
    console.error("Erro ao remover membro:", error);
    setStatus((s) => ({
      ...s,
      update: "error",
      error: error.message,
    }));
    resetStatus();
    throw error;
  }
};

const addProjectToCoordination = async (coordinationId, projectId) => {
    const ref = doc(db, "coordinations", coordinationId);
    const coord = coordinations.find((c) => c.id === coordinationId);
    if (!coord) throw new Error("Coordenação não encontrada.");

    const newProjects = coord.projetos ? [...coord.projetos, projectId] : [projectId];
    await updateDoc(ref, { projetos: newProjects, updatedAt: serverTimestamp() });

    setCoordinations((prev) =>
      prev.map((c) => (c.id === coordinationId ? { ...c, projetos: newProjects } : c))
    );
    return newProjects;
  };

  return {
    coordinations,
    loading,
    status,
    resetStatus,
    createCoordination,
    updateCoordination,
    deleteCoordination,
    getCoordinationById,
    getCoordinationByState,
    getCoordinationWithProjects,
    removeTeamMember,
    addProjectToCoordination
  };
}
