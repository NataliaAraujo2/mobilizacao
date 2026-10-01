import { useRef, useState } from "react";
import BrazilMap from "../components/BrazilMap/BrazilMap";
import PublicActionsPanel from "../components/PublicActionsPanel";
import { useAuth } from "../auth/useAuth";
import { BRAZIL_STATE_BY_CODE } from "../domain/locations/brazilStates";
import campaignLogo from "../assets/brand/mobilizacao-logo-colorido.webp";
import guinho from "../assets/brand/guinho.png";
import beachVolunteers from "../assets/brand/acoes-2026-praia.webp";
import styles from "./CampaignGateway.module.css";

export default function Campaign2026Page() {
  const [selectedState, setSelectedState] = useState("");
  const [mapOpen, setMapOpen] = useState(false);
  const mapRef = useRef(null);
  const { user, claims } = useAuth();
  const stateName = BRAZIL_STATE_BY_CODE[selectedState]?.name ?? selectedState;

  function openMap() {
    setMapOpen(true);
    window.requestAnimationFrame(() => mapRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }

  return (
    <main className={`${styles.page} ${styles.campaignPage}`}>
      <section className={styles.actionsShowcase} aria-labelledby="actions-map-title">
        <article className={styles.actionsPhotoCard}>
          <img src={beachVolunteers} alt="Voluntárias da ONG Moradia e Cidadania em uma ação de limpeza na praia" />
          <div><strong>Ações</strong><span>Mapa interativo</span></div>
        </article>
        <section className={styles.actionsGuideCard}>
          <div className={styles.actionsGuideBrand}>
            <img src={campaignLogo} alt="MobilizAÇÃO 2026 — Semeando e Cultivando o Futuro" />
            <button type="button" onClick={openMap}>Abra o mapa interativo</button>
          </div>
          <div className={styles.actionsGuideInfo}>
            <img src={guinho} alt="Guinho, o planeta mascote da MobilizAÇÃO" />
            <ul>
              <li><b>Escolha seu estado no mapa</b><span>e descubra ações perto de você</span></li>
              <li><b>Participe de iniciativas que</b><span>transformam comunidades locais</span></li>
              <li><b>Seja voluntário</b><span>e faça a diferença na sua região</span></li>
              <li><b>Conecte-se e colabore</b><span>fortaleça nossa rede em todo o Brasil</span></li>
            </ul>
          </div>
        </section>
      </section>

      {mapOpen && <section ref={mapRef} className={styles.campaignMapCard} aria-labelledby="actions-map-title">
        <div className={styles.mapIntro}>
          <p className={styles.eyebrow}>Mapa interativo</p>
          <h1 id="actions-map-title">Escolha seu estado</h1>
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
      </section>}
    </main>
  );
}
