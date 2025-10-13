import React, { useState, useEffect } from "react";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import BrazilMap from "../components/BrazilMap";
import VolunteerCall from "../components/VolunteerCall";
import ProjectView from "../components/ProjectView";
import About from "../components/About";
import styles from "../styles/Home.module.css";
import Header from "../components/Header";
import logo from "../assets/logo_mobilizacao.png";
import Modal from "../components/ui/Modal";
import { useProjects } from "../hooks/useProjects";

export default function Home() {
  const [showMap, setShowMap] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [selectedState, setSelectedState] = useState(null);
  const [selectedProject, setSelectedProject] = useState(null);
  const [loadingProject, setLoadingProject] = useState(false);

  const { getProjectByState } = useProjects();

  // 🔹 Responsividade
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const anchorLinks = [
    { label: "Sobre", href: "#sobre-projeto" },
    { label: "Mobilização", href: "#mobilizacao" },
    { label: "Parceiros", href: "#parceiros" },
    { label: "Coordenações", href: "#coordenacoes" },
  ];

  // 🔹 Ao clicar em um estado
  const handleSelectState = async (uf) => {
    setSelectedState(uf);
    setLoadingProject(true);
    try {
      const project = await getProjectByState(uf);
      setSelectedProject(project || null);
    } catch (err) {
      console.error("Erro ao buscar projeto:", err);
      setSelectedProject(null);
    } finally {
      setLoadingProject(false);
    }

    if (isMobile) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  // 🔹 Fechar modal
  const handleCloseModal = () => {
    setSelectedProject(null);
    setSelectedState(null);
  };

  return (
    <>
      <Header anchorLinks={anchorLinks} />
      <main className={styles.home}>
        <header className={styles.hero}>
          {!selectedProject && (
            <>
              <VolunteerCall />

              <div
                className={styles.mapContainer}
                onMouseEnter={() => !isMobile && setShowMap(true)}
                onMouseLeave={() => !isMobile && setShowMap(false)}
              >
                <Card title="Descubra a ação na sua região. É só clicar no mapa!">
                  {isMobile || showMap ? (
                    <div className={styles.mapInteractive}>
                      <BrazilMap
                        onSelectState={handleSelectState}
                        selectedState={selectedState}
                      />
                    </div>
                  ) : (
                    <img
                      src={logo}
                      alt="Mapa do Brasil ilustrativo representando o alcance nacional da campanha de mobilização"
                      className={styles.mapImage}
                    />
                  )}
                </Card>
              </div>
            </>
          )}

          {/* 🔹 Modal com o projeto selecionado */}
          <Modal
            isOpen={!!selectedState}
            onClose={handleCloseModal}
          >
            {loadingProject ? (
              <p style={{ textAlign: "center" }}>Carregando informações...</p>
            ) : selectedProject ? (
              <ProjectView
                selectedState={selectedProject.state}
                onClick={handleCloseModal}
              />
            ) : (
              <div className={styles.cardFull}>
                <Card title="Projeto não encontrado">
                  <p>
                    Ainda não há dados cadastrados para o estado{" "}
                    <strong>{selectedState}</strong>.
                  </p>
                  <Button onClick={handleCloseModal}>Fechar</Button>
                </Card>
              </div>
            )}
          </Modal>

          {isMobile && (
            <div className={styles.mobileMapButton}>
              <Button variant="secondary" onClick={() => setShowMap(!showMap)}>
                {showMap ? "Ocultar mapa" : "Explorar Mapa do Brasil"}
              </Button>
            </div>
          )}
        </header>

        {/* === Seções de conteúdo === */}
        <section id="sobre-projeto" className={styles.cards}>
          <Card>
            <About />
          </Card>
        </section>

        <section id="mobilizacao" className={styles.cards}>
          <Card title="Mobilização Nacional">
            <p>
              Uma grande ação simultânea em todas as regiões do Brasil, unindo
              voluntários em iniciativas sociais de impacto.
            </p>
          </Card>
        </section>

        <section id="voluntarios" className={styles.cards}>
          <Card title="Voluntariado">
            <p>
              Empresas, ONGs e cidadãos unidos por uma mesma causa: gerar
              impacto social positivo.
            </p>
          </Card>
        </section>

        <section id="coordenacoes" className={styles.cards}>
          <Card title="Coordenações estaduais">
            <p>
              Descubra como estamos organizados em cada estado e como você pode
              colaborar localmente.
            </p>
          </Card>
        </section>
      </main>
    </>
  );
}
