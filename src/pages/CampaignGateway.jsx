import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import BrazilMap from "../components/BrazilMap/BrazilMap";
import PublicActionsPanel from "../components/PublicActionsPanel";
import { BRAZIL_STATE_BY_CODE } from "../domain/locations/brazilStates";
import logo2025 from "../assets/brand/mobilizacao-logo-2025.webp";
import logo2026 from "../assets/brand/mobilizacao-logo-colorido.webp";
import associatesBanner from "../assets/brand/campanha-associados-2026.webp";
import leavesElement from "../assets/brand/elements/elemento-01.webp";
import growingElement from "../assets/brand/elements/elemento-03.webp";
import sproutElement from "../assets/brand/elements/elemento-05.webp";
import { getNewAssociatesCount } from "../services/associationStatsService";
import PublicCoordinatorAccess from '../components/PublicCoordinatorAccess';
import styles from "./CampaignGateway.module.css";

function AssociatesCounter() {
  const counterRef = useRef(null);
  const [visible, setVisible] = useState(false);
  const [count, setCount] = useState(null);
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    const target = counterRef.current;
    if (!target) return undefined;
    if (!("IntersectionObserver" in window)) {
      setVisible(true);
      return undefined;
    }
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      setVisible(true);
      observer.disconnect();
    }, { rootMargin: "160px" });
    observer.observe(target);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!visible) return undefined;
    let active = true;
    getNewAssociatesCount()
      .then((value) => { if (active) setCount(value); })
      .catch(() => { if (active) setUnavailable(true); });
    return () => { active = false; };
  }, [visible]);

  return (
    <div ref={counterRef} className={styles.associatesCounter} aria-live="polite" aria-busy={visible && count === null}>
      <small>Já somos</small>
      <strong>{!visible || count === null ? "—" : count.toLocaleString("pt-BR")}</strong>
      <span>{unavailable ? "contador em atualização" : "novos associados"}</span>
    </div>
  );
}

const VOLUNTEER_CHOICES_OPEN_AT = new Date("2026-10-21T00:00:00-03:00").getTime();

function getRemainingTime() {
  const difference = Math.max(0, VOLUNTEER_CHOICES_OPEN_AT - Date.now());
  return {
    isOpen: difference === 0,
    days: Math.floor(difference / 86_400_000),
    hours: Math.floor((difference % 86_400_000) / 3_600_000),
    minutes: Math.floor((difference % 3_600_000) / 60_000),
  };
}

function VolunteerChoicesCountdown() {
  const [remainingTime, setRemainingTime] = useState(getRemainingTime);

  useEffect(() => {
    const interval = window.setInterval(() => setRemainingTime(getRemainingTime()), 30_000);
    return () => window.clearInterval(interval);
  }, []);

  if (remainingTime.isOpen) {
    return <p className={styles.openNotice}>As escolhas de ações para voluntariado já estão abertas.</p>;
  }

  const units = [
    [remainingTime.days, "dias"],
    [remainingTime.hours, "horas"],
    [remainingTime.minutes, "minutos"],
  ];

  return (
    <div className={styles.countdown} aria-live="polite" aria-label={`Faltam ${remainingTime.days} dias, ${remainingTime.hours} horas e ${remainingTime.minutes} minutos para abertura das escolhas de ações`}>
      {units.map(([value, label]) => (
        <span key={label}><strong>{String(value).padStart(2, "0")}</strong><small>{label}</small></span>
      ))}
    </div>
  );
}

export default function CampaignGateway() {
  const [selectedState, setSelectedState] = useState("");
  const [mapOpen, setMapOpen] = useState(false);
  const [mapPreview, setMapPreview] = useState(false);
  const { user, claims } = useAuth();
  const mapVisible = mapOpen || mapPreview;

  function closePreviewWhenLeaving(event) {
    if (!event.currentTarget.contains(event.relatedTarget)) setMapPreview(false);
  }

  function selectState(state) {
    setSelectedState(state);
    setMapOpen(true);
  }

  function closeMap() {
    setSelectedState('');
    setMapOpen(false);
    setMapPreview(false);
  }

  return (
    <main className={styles.page}>
      <section className={styles.intro} aria-labelledby="editions-title">
        <p className={styles.eyebrow}>ONG Moradia e Cidadania</p>
        <h1 id="editions-title" className={styles.wordmark} aria-label="MobilizAÇÃO">
          <span>Mobiliz</span><em>AÇÃO</em>
        </h1>
        <p>Conheça nossas edições e acompanhe o que estamos preparando.</p>
      </section>

      <section className={styles.mapTeaser} aria-labelledby="map-teaser-title" onMouseEnter={() => setMapPreview(true)} onMouseLeave={() => setMapPreview(false)} onFocus={() => setMapPreview(true)} onBlur={closePreviewWhenLeaving}>
        <img className={`${styles.kitElement} ${styles.kitLeaves}`} src={leavesElement} alt="" aria-hidden="true" />
        <img className={`${styles.kitElement} ${styles.kitGrowing}`} src={growingElement} alt="" aria-hidden="true" />
        <img className={`${styles.kitElement} ${styles.kitSprout}`} src={sproutElement} alt="" aria-hidden="true" />
        <div className={styles.mapTeaserCopy}>
          <p className={styles.eyebrow}>MobilizAÇÃO 2026</p>
          <h2 id="map-teaser-title">Em 21 de outubro, escolha sua ação!</h2>
          <p>Em breve, você poderá escolher a ação em que deseja atuar como voluntário e acompanhar as mobilizações em cada estado.</p>
          <VolunteerChoicesCountdown />
          <Link className={styles.teaserLink} to="/2026">Conhecer a edição 2026 <b aria-hidden="true">→</b></Link>
        </div>
        <button className={styles.mapLogoButton} type="button" aria-expanded={mapVisible} aria-controls="mapa-acoes-publico" onClick={() => mapOpen ? closeMap() : setMapOpen(true)}>
          <img className={styles.mapLogo} src={logo2026} alt="MobilizAÇÃO 2026 — Semeando e Cultivando o Futuro" width="1400" height="1466" />
          <span>{mapOpen ? "Fechar mapa" : "Passe o mouse ou toque no mapa"}</span>
        </button>
        {mapVisible && <div id="mapa-acoes-publico" className={styles.publicMap}>
          <div className={styles.mapIntro}><p className={styles.eyebrow}>Mapa interativo</p><h3>Escolha um estado</h3><p>Toque ou clique no estado para ver as ações disponíveis.</p></div>
          <div className={`${styles.mapLayout} ${selectedState ? styles.mapWithActions : ''}`}>
            <div className={styles.mapCanvas}>
              <BrazilMap selectedState={selectedState} onSelectState={selectState} />
              <p className={styles.mapResult} aria-live="polite">{selectedState ? <>Estado selecionado: <strong>{BRAZIL_STATE_BY_CODE[selectedState]?.name} ({selectedState})</strong></> : "Nenhum estado selecionado."}</p>
            </div>
            {selectedState && <aside className={styles.actionsModal} aria-label={`Ações disponíveis em ${BRAZIL_STATE_BY_CODE[selectedState]?.name ?? selectedState}`}>
              <header><strong>{BRAZIL_STATE_BY_CODE[selectedState]?.name ?? selectedState}</strong><button type="button" onClick={closeMap} aria-label="Fechar ações">×</button></header>
              <PublicActionsPanel state={selectedState} user={user} claims={claims} />
            </aside>}
          </div>
        </div>}
      </section>

      <section className={styles.previousEditions} aria-labelledby="previous-editions-title">
        <div className={styles.previousHeading}>
          <p className={styles.eyebrow}>Nossa história</p>
          <h2 id="previous-editions-title">Conheça nossas edições anteriores</h2>
        </div>
        <Link className={styles.previousCard} to="/2025">
          <img src={logo2025} alt="Marca da MobilizAÇÃO 2025" width="900" height="900" />
          <span className={styles.year}>2025</span>
          <span className={styles.previousCopy}>
            <strong>MobilizAÇÃO 2025</strong>
            <small>Relembre a campanha e conheça as ações da edição anterior.</small>
          </span>
          <span className={styles.previousLink}>Ver relatório da edição 2025 <b aria-hidden="true">→</b></span>
        </Link>
      </section>

      <section className={styles.activeCampaign} aria-labelledby="active-campaign-title">
        <div className={styles.campaignHeading}>
          <div>
            <p className={styles.eyebrow}>Associação em andamento</p>
            <h2 id="active-campaign-title">Você já pode contribuir para a MobilizAÇÃO! Seja um associado</h2>
          </div>
          <AssociatesCounter />
        </div>
        <img
          src={associatesBanner}
          alt="Seja um associado da ONG Moradia e Cidadania. De 1º de setembro a 31 de dezembro de 2026, cada novo associado representa uma árvore plantada."
          width="1920"
          height="689"
        />
      </section>
      <PublicCoordinatorAccess />
    </main>
  );
}
