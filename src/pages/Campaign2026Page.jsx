import { useRef, useState } from "react";
import BrazilMap from "../components/BrazilMap/BrazilMap";
import PublicActionsPanel from "../components/PublicActionsPanel";
import { useAuth } from "../auth/useAuth";
import { BRAZIL_STATE_BY_CODE } from "../domain/locations/brazilStates";
import campaignLogo from "../assets/brand/mobilizacao-logo-colorido.webp";
import guinho from "../assets/brand/guinhos/huguinhoPlanta.png";
import beachVolunteers from "../assets/brand/acoes-2026-praia-cortada.png";
import collaborationIcon from "../assets/brand/icone-colaboracao.png";
import styles from "./CampaignGateway.module.css";

function GuideIcon({ type }) {
  const icons = {
    pin: <path d="M12 21s6-5.1 6-11a6 6 0 1 0-12 0c0 5.9 6 11 6 11Zm0-8.2A2.8 2.8 0 1 1 12 7a2.8 2.8 0 0 1 0 5.8Z" />,
    people: <><circle cx="9" cy="8" r="3" /><circle cx="16.5" cy="9" r="2.5" /><path d="M3.5 19c.5-3.3 2.5-5 5.5-5s5 1.7 5.5 5M14 18.8c.2-2.3 1.5-3.7 3.8-3.7 1.8 0 3.2 1.1 3.7 3.2" /></>,
    heart: <path d="M12 20.3 4.8 13A4.8 4.8 0 0 1 11.6 6L12 6.5l.4-.5A4.8 4.8 0 0 1 19.2 13L12 20.3Z" />,
  };
  return <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">{icons[type]}</svg>;
}

function MapButtonIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path d="m3.5 5.2 5-2 7 2.6 5-2v15l-5 2-7-2.6-5 2v-15Z" />
    <path d="M8.5 3.2v15M15.5 5.8v15" />
  </svg>;
}

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
        <section className={styles.actionsHero}>
          <article className={styles.actionsPhotoCard}>
            <img src={beachVolunteers} alt="Voluntárias da ONG Moradia e Cidadania em uma ação de limpeza na praia" />
            <div><h1 id="actions-map-title">Ações</h1><strong>Mapa interativo</strong></div>
          </article>
          <div className={styles.actionsGuideBrand}>
            <img src={campaignLogo} alt="MobilizAÇÃO 2026 — Semeando e Cultivando o Futuro" />
            <button type="button" onClick={openMap}><MapButtonIcon /> Abra o mapa interativo <b aria-hidden="true">→</b></button>
          </div>
          <img className={styles.actionsHeroGuinho} src={guinho} alt="Guinho, o planeta mascote da MobilizAÇÃO, com uma plantinha" />
        </section>
        <ul className={styles.actionsGuideInfo}>
          <li><i><GuideIcon type="pin" /></i><div><b>Escolha seu estado</b><span>Navegue pelo mapa e veja as ações da sua região.</span></div></li>
          <li><i><GuideIcon type="heart" /></i><div><b>Descubra ações</b><span>Conheça iniciativas que transformam comunidades locais.</span></div></li>
          <li><i><GuideIcon type="people" /></i><div><b>Seja voluntário</b><span>Faça a diferença na sua região.</span></div></li>
          <li><i><img src={collaborationIcon} alt="" aria-hidden="true" /></i><div><b>Conecte-se e colabore</b><span>Fortaleça nossa rede em todo o Brasil.</span></div></li>
        </ul>
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
