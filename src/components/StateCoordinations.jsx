import React, { useState, useEffect } from "react";
import styles from "../styles/StateCoordinations.module.css";
import modalStyles from "../styles/Modal.module.css";
import { useCoordination } from "../hooks/useCoordination";
import Button from "./ui/Button";
const imagens = import.meta.glob("/src/assets/team/**/*.jpg", { eager: true });

const tabs = [
  "Equipe",
  "Projetos em andamento",
  "Projetos concluídos",
  "Produtos",
  "Parceiros Estaduais",
  "Informativos Estaduais",
  "Fale conosco",
];

export default function StateCoordinations({
  initialTab,
  selectedState,
  onClick,
}) {
  const [selectedTab, setSelectedTab] = useState(initialTab || "Equipe");
  const [team, setTeam] = useState([]);
  const [loadingTeam, setLoadingTeam] = useState(true);
  // Função auxiliar para buscar a imagem pelo caminho
  function getFoto(path) {
    return imagens[`/src${path}`]?.default || "/assets/default-photo.jpg";
  }
  const { getCoordinationByState } = useCoordination();

  // 🔹 Buscar equipe do estado selecionado
  useEffect(() => {
    if (!selectedState) return;

    const fetchTeam = async () => {
      setLoadingTeam(true);
      try {
        const coord = await getCoordinationByState(selectedState);
        setTeam(coord?.team || []);
      } catch (err) {
        console.error("Erro ao buscar equipe:", err);
        setTeam([]);
      } finally {
        setLoadingTeam(false);
      }
    };

    fetchTeam();
  }, [selectedState, getCoordinationByState]);

  if (!selectedState) return null; // segurança

  return (
    <div className={styles.container}>
      <h1 className={styles.sidebarTitle}>
        {`${selectedState}` || "Nacional"}
      </h1>
      <div className={styles.content}>
        {/* === SIDEBAR === */}
        <aside className={styles.sidebar}>
          <div className={styles.tabs}>
            {tabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setSelectedTab(tab)}
                className={`${styles.tabButton} ${
                  selectedTab === tab ? styles.activeTab : ""
                }`}
              >
                {tab}
              </button>
            ))}
            <Button
              variant="secondary"
              onClick={onClick}
              style={{ marginBottom: "1rem" }}
            >
              ← Voltar
            </Button>
          </div>
        </aside>

        {/* === CONTEÚDO DA ABA === */}
        <div className={styles.main}>
          {selectedTab === "Equipe" ? (
            <div className={modalStyles.teamGrid}>
              {loadingTeam ? (
                <p>Carregando equipe...</p>
              ) : team.length > 0 ? (
                team.map((member) => (
                  <div key={member.nome} className={modalStyles.teamCard}>
                    <img
                      src={getFoto(member.foto)}
                      alt={`Foto de ${member.nome}`}
                      className={modalStyles.teamPhoto}
                    />
                    {console.log(member.foto)}
                    <h4>{member.nome}</h4>
                    <p className={styles.teamCardP}>{member.cargo}</p>
                  </div>
                ))
              ) : (
                <p>Nenhum membro cadastrado para este estado.</p>
              )}
            </div>
          ) : (
            <p>
              Conteúdo da aba <strong>{selectedTab}</strong> para o estado{" "}
              <strong>{selectedState}</strong>.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
