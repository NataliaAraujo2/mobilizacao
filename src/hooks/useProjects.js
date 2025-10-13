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

export function useProjects(coordinationHook = null) {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  const [status, setStatus] = useState({
    create: "idle",
    update: "idle",
    delete: "idle",
    fetch: "idle",
    error: null,
    message: null,
  });

  const isValidState = (state) =>
    brazilStates.some(
      (s) =>
        s.name.toLowerCase() === state.toLowerCase() ||
        s.code.toUpperCase() === state.toUpperCase()
    );

  useEffect(() => {
    setStatus((s) => ({ ...s, fetch: "loading" }));
    const q = query(collection(db, "projects"), orderBy("state"));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        setProjects(data);
        setLoading(false);
        setStatus((s) => ({ ...s, fetch: "success", error: null }));
      },
      (error) => {
        console.error("❌ Erro ao carregar projetos:", error);
        setLoading(false);
        setStatus((s) => ({ ...s, fetch: "error", error: error.message }));
      }
    );
    return () => unsubscribe();
  }, []);

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

  // 🔹 Criar projeto com integração opcional
  const createProject = async (projectData, coordinationId = null) => {
    setStatus((s) => ({ ...s, create: "loading", error: null, message: null }));
    try {
      if (!projectData.state || !isValidState(projectData.state)) {
        throw new Error(`Estado inválido: ${projectData.state}`);
      }

      const existing = projects.find(
        (p) => p.state.toLowerCase() === projectData.state.toLowerCase()
      );
      if (existing) throw new Error(`Projeto para o estado ${projectData.state} já existe.`);

      const dataToSave = {
        ...projectData,
        projetos: projectData.projetos || [],
        team: projectData.team || [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      const ref = await addDoc(collection(db, "projects"), dataToSave);

      setProjects((prev) => [...prev, { id: ref.id, ...dataToSave }]);
      setStatus((s) => ({ ...s, create: "success", message: "Projeto criado com sucesso!" }));
      resetStatus();

      // 🔹 Integração com coordenação
      if (coordinationId && coordinationHook?.addProjectToCoordination) {
        await coordinationHook.addProjectToCoordination(coordinationId, ref.id);
      }

      return ref.id;
    } catch (error) {
      setStatus((s) => ({ ...s, create: "error", error: error.message }));
      resetStatus();
      throw error;
    }
  };

  // 🔹 Atualizar coordenação existente
  const updateProject = async (id, projectData) => {
    setStatus((s) => ({ ...s, update: "loading", error: null, message: null }));

    try {
      if (projectData.state && !isValidState(projectData.state)) {
        throw new Error(`Estado inválido: ${projectData.state}`);
      }

      const ref = doc(db, "projects", id);
      const dataToUpdate = { ...projectData, updatedAt: serverTimestamp() };
      await updateDoc(ref, dataToUpdate);

      setProjects((prev) =>
        prev.map((project) =>
          project.id === id ? { ...project, ...dataToUpdate } : project
        )
      );

      setStatus((s) => ({
        ...s,
        update: "success",
        message: "Projeto atualizado com sucesso!",
      }));
      resetStatus();
    } catch (error) {
      setStatus((s) => ({ ...s, update: "error", error: error.message }));
      resetStatus();
      throw error;
    }
  };

  // 🔹 Deletar coordenaprojetoção
  const deleteProject = async (id) => {
    setStatus((s) => ({ ...s, delete: "loading", error: null, message: null }));

    try {
      const ref = doc(db, "projects", id);
      await deleteDoc(ref);

      setProjects((prev) => prev.filter((project) => project.id !== id));

      setStatus((s) => ({
        ...s,
        delete: "success",
        message: "Projeto deletado com sucesso!",
      }));
      resetStatus();
    } catch (error) {
      setStatus((s) => ({ ...s, delete: "error", error: error.message }));
      resetStatus();
      throw error;
    }
  };

  // 🔹 Buscar projeto por ID
  const getProjectById = useCallback(async (id) => {
    const ref = doc(db, "projects", id);
    const snap = await getDoc(ref);
    return snap.exists() ? { id: snap.id, ...snap.data() } : null;
  }, []);

  // 🔹 Buscar projeto por estado
  const getProjectByState = useCallback(async (state) => {
    if (!isValidState(state)) return null;
    const q = query(collection(db, "projects"), where("state", "==", state));
    const snap = await getDocs(q);
    if (!snap.empty) {
      const docData = snap.docs[0];
      return { id: docData.id, ...docData.data() };
    }
    return null;
  }, []);

  // 🔹 Remover material específico do projeto (Firestore + estado local)
  const removeMaterial = async (projectId, material) => {
    setStatus((s) => ({ ...s, update: "loading", error: null, message: null }));

    try {
      const ref = doc(db, "projects", projectId);

      // 🔸 Busca o projeto localmente
      const proj = projects.find((c) => c.id === projectId);
      if (!proj) throw new Error("Coordenação não encontrada.");

      // 🔸 Cria um novo array sem o membro removido
      const newMaterials = proj.team.filter((m) => m.nome !== material.nome);

      // 🔸 Atualiza no Firestore
      await updateDoc(ref, { team: newMaterials });

      // 🔸 Atualiza no estado local
      setProjects((prev) =>
        prev.map((c) => (c.id === projectId ? { ...c, team: newMaterials } : c))
      );

      setStatus((s) => ({
        ...s,
        update: "success",
        message: `Material "${material.nome}" removido com sucesso.`,
      }));
      resetStatus();

      return newMaterials; // ✅ Retorna o novo mateirais atualizado
    } catch (error) {
      console.error("Erro ao remover material:", error);
      setStatus((s) => ({
        ...s,
        update: "error",
        error: error.message,
      }));
      resetStatus();
      throw error;
    }
  };

  return {
    projects,
    loading,
    status,
    resetStatus,
    createProject,
    updateProject,
    deleteProject,
    getProjectById,
    getProjectByState,
    removeMaterial,
  };
}
