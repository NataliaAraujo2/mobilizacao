import { useState } from "react";
import BrazilMap from "../components/BrazilMap/BrazilMap";
import PublicActionsPanel from "../components/PublicActionsPanel";
import { useAuth } from "../auth/useAuth";
import { BRAZIL_STATE_BY_CODE } from "../domain/locations/brazilStates";
import heroActionElement from "../assets/brand/elements/elemento-04.webp";
import styles from "./CampaignGateway.module.css";

export default function Campaign2026Page() {
  const [selectedState, setSelectedState] = useState("");
  const { user, claims } = useAuth();
  const stateName = BRAZIL_STATE_BY_CODE[selectedState]?.name ?? selectedState;

  return (
    <main className={`${styles.page} ${styles.campaignPage}`}>
      <header className={styles.campaignHeader}>
        <p className={styles.eyebrow}>MobilizAÇÃO 2026 · 2ª edição</p>
        <h1><span>Mobiliz</span><em>AÇÃO</em></h1>
        <h2>Semeando e cultivando o futuro</h2>
        <p>Encontre uma ação perto de você e participe do voluntariado que transforma vidas e territórios.</p>
      </header>

      <section className={styles.campaignMapCard} aria-labelledby="actions-map-title">
        <div className={styles.mapIntro}>
          <img src={heroActionElement} alt="" aria-hidden="true" />
          <p className={styles.eyebrow}>Mapa interativo</p>
          <h2 id="actions-map-title">Escolha seu estado</h2>
          <p>Toque ou clique no mapa para conhecer as ações disponíveis na sua coordenação.</p>
        </div>
        <div className={`${styles.mapLayout} ${selectedState ? styles.mapWithActions : ''}`}>
          <div className={styles.mapCanvas}>
            <BrazilMap selectedState={selectedState} onSelectState={setSelectedState} />
            <p className={styles.mapResult} aria-live="polite">{selectedState ? <>Estado selecionado: <strong>{stateName} ({selectedState})</strong></> : "Nenhum estado selecionado."}</p>
          </div>
          {selectedState && <aside className={styles.actionsModal} aria-label={`Ações disponíveis em ${stateName}`}>
            <header><strong>{stateName}</strong><button type="button" onClick={() => setSelectedState('')} aria-label="Fechar ações">×</button></header>
            <PublicActionsPanel state={selectedState} user={user} claims={claims} />
          </aside>}
        </div>
      </section>
    </main>
  );
}
