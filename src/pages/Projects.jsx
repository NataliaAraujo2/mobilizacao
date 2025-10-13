import React, { useState } from "react";

// 🔹 CSS Modules
import styles from "../styles/StateCoordinations.module.css";
import modalStyles from "../styles/Modal.module.css";

// 🔹 utilitários
import stateNames from "../utils/stateNames";

import BrazilMap from "../components/BrazilMap";

const tabs = [
  "Nome do Projeto:",
  "Endereço/Localização:",
  "Fotos:",
  "Descrição Resumida:",
  "Materiais que Voluntários podem Levar:",
  "Contatos:",
  "QR Code para Doações",
];

const Projects = () => {
  const [selectedState, setSelectedState] = useState(null);
  const [selectedTab, setSelectedTab] = useState(null);

  // recebe a UF diretamente do BrazilMap
  const handleSelectState = (uf) => {
    setSelectedState(uf);
    setSelectedTab(null); // reseta a aba ao trocar de estado
    console.log(uf)
  };

  const closeModal = () => {
    setSelectedTab(null);
  };

  return (
    <div className={styles.container}>
      {/* === MAPA === */}
      <div className={styles.mapContainer}>
        <BrazilMap
          onSelectState={handleSelectState}
          selectedState={selectedState}
        />
      </div>

      {/* === SIDEBAR === */}
      <aside className={styles.sidebar}>
        <h2 className={styles.sidebarTitle}>
          {selectedState ? selectedState : "Nacional"}
        </h2>

        <div className={styles.tabs}>
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setSelectedTab(tab)}
              className={`${styles.tabButton} ${
                selectedTab === tab ? styles.activeTab : ""
              }`}
              disabled={!selectedState}
            >
              {tab}
            </button>
          ))}
        </div>
      </aside>

      {/* === MODAL === */}
      {selectedTab && (
        <div className={modalStyles.modalBackdrop} onClick={closeModal}>
          <div
            className={modalStyles.modal}
            onClick={(e) => e.stopPropagation()}
          >
            <h3>
              {selectedTab} – {selectedState}
            </h3>
            <div className={modalStyles.modalContent}>
              <p>
                Aqui vai o conteúdo da aba <strong>{selectedTab}</strong> para o
                estado <strong>{stateNames[selectedState]}</strong>.
              </p>
            </div>

            <div className={modalStyles.actions}>
              <button onClick={closeModal}>Fechar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Projects;
