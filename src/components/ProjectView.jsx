import React, { useState, useEffect } from "react";
import { useProjects } from "../hooks/useProjects";
import styles from "../styles/ProjectView.module.css";

const imagens = import.meta.glob("/src/assets/projects/**/*.jpg", { eager: true });

export default function ProjectView({ selectedState, onClick }) {
  const [projectData, setProjectData] = useState(null);
  const [loading, setLoading] = useState(true);
  const { getProjectByState } = useProjects();

  // Função para buscar imagem
  const getFoto = (path) => imagens[`/src${path}`]?.default || "/assets/default-photo.jpg";

  useEffect(() => {
    if (!selectedState) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const data = await getProjectByState(selectedState);
        setProjectData(data);
      } catch (err) {
        console.error("Erro ao buscar dados do projeto:", err);
        setProjectData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedState, getProjectByState]);

  if (!selectedState) return null;

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>{selectedState}</h1>

      <div className={styles.grid}>
        {/* === Quadro 1: Fotos da Ação === */}
        <div className={styles.card}>
          <h2>Fotos da Ação</h2>
          {loading ? (
            <p>Carregando fotos...</p>
          ) : projectData?.fotos?.length > 0 ? (
            <div className={styles.photoGrid}>
              {projectData.fotos.map((foto, index) => (
                <img
                  key={index}
                  src={getFoto(foto)}
                  alt={`Foto da ação ${index + 1}`}
                  className={styles.photo}
                />
              ))}
            </div>
          ) : (
            <p>Nenhuma foto disponível.</p>
          )}
        </div>

        {/* === Quadro 2: Descrição da Ação === */}
        <div className={styles.card}>
          <h2>Descrição da Ação</h2>
          {loading ? (
            <p>Carregando descrição...</p>
          ) : projectData?.descricao ? (
            <p>{projectData.descricao}</p>
          ) : (
            <p>Descrição não disponível.</p>
          )}
        </div>

        {/* === Quadro 3: Materiais === */}
        <div className={styles.card}>
          <h2>Materiais</h2>
          {loading ? (
            <p>Carregando materiais...</p>
          ) : projectData?.materiais?.length > 0 ? (
            <ul>
              {projectData.materiais.map((item, index) => (
                <li key={index}>{item}</li>
              ))}
            </ul>
          ) : (
            <p>Nenhum material registrado.</p>
          )}
        </div>

        {/* === Quadro 4: Contatos da Coordenação === */}
        <div className={styles.card}>
          <h2>Contatos da Coordenação</h2>
          {loading ? (
            <p>Carregando contatos...</p>
          ) : projectData?.contatos ? (
            <>
              <p>Email: {projectData.contatos.email}</p>
              <p>Telefone: {projectData.contatos.telefone}</p>
              <p>Whatsapp: {projectData.contatos.whatsapp}</p>
              {projectData.qrcodePix?.imagem && (
                <div className={styles.qrcode}>
                  <p>Pix:</p>
                  <img
                    src={getFoto(projectData.qrcodePix.imagem)}
                    alt="QR Code Pix"
                    className={styles.qrcodeImg}
                  />
                </div>
              )}
            </>
          ) : (
            <p>Contato não disponível.</p>
          )}
        </div>
      </div>

      <button className={styles.backButton} onClick={onClick}>
        ← Voltar
      </button>
    </div>
  );
}
