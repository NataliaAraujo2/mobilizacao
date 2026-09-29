import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import BrazilMap from "../components/BrazilMap/BrazilMap";
import PublicActionsPanel from "../components/PublicActionsPanel";
import { BRAZIL_STATE_BY_CODE } from "../domain/locations/brazilStates";
import logo2025 from "../assets/brand/mobilizacao-logo-2025.webp";
import associatesGroupPhoto from "../assets/brand/campanha-associados-2026.webp";
import whoWeAreImage from "../assets/brand/quem-somos.svg";
import leavesElement from "../assets/brand/elements/elemento-01.webp";
import sproutElement from "../assets/brand/elements/elemento-05.webp";
import { getNewAssociatesCount } from "../services/associationStatsService";
import { getPublicVolunteerCount } from "../services/publicVolunteerService";
import PublicCoordinatorAccess from '../components/PublicCoordinatorAccess';
import styles from "./CampaignGateway.module.css";

const CAMPAIGN_YEAR = '2026';

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

function VolunteerCounter() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let active = true;
    getPublicVolunteerCount(CAMPAIGN_YEAR)
      .then(({ count: value }) => { if (active) setCount(Number.isSafeInteger(value) && value >= 0 ? value : 0); })
      .catch(() => { if (active) setCount(0); });
    return () => { active = false; };
  }, []);

  return <strong aria-live="polite">{count.toLocaleString("pt-BR")}</strong>;
}

export default function CampaignGateway() {
  const [selectedState, setSelectedState] = useState("");
  const [heroExpanded, setHeroExpanded] = useState(false);
  const mapRef = useRef(null);
  const { user, claims } = useAuth();

  useEffect(() => {
    if (!heroExpanded || !mapRef.current) return undefined;
    const frame = window.requestAnimationFrame(() => {
      const mapTop = mapRef.current.getBoundingClientRect().top + window.scrollY;
      window.scrollTo({ top: Math.max(0, mapTop - 88), behavior: "smooth" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [heroExpanded]);

  function selectState(state) {
    setSelectedState(state);
    setHeroExpanded(true);
  }

  function closeMap() {
    setSelectedState('');
    setHeroExpanded(false);
  }

  function toggleActions() {
    if (heroExpanded) closeMap();
    else setHeroExpanded(true);
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

      <section id="acoes-2026" className={`${styles.homeIntroCard} ${heroExpanded ? styles.homeIntroCardExpanded : ''}`} aria-labelledby="home-hero-title">
        <div className={styles.homeHeroCopy}>
          <p className={styles.heroEdition}>2ª Edição</p>
          <h2 id="home-hero-title" className={styles.heroWordmark}><span>Mobiliz</span><em>AÇÃO</em></h2>
          <p className={styles.heroTitle}>Semeando e<br />Cultivando<br />o Futuro!</p>
          <p className={styles.heroDescription}>Voluntariado que transforma<br />vidas e territórios</p>
          <button className={styles.heroAction} type="button" aria-expanded={heroExpanded} aria-controls="mapa-acoes-publico" onClick={toggleActions}>{heroExpanded ? 'Fechar ações de 2026' : 'Conheça as ações de 2026'}</button>
        </div>
        {heroExpanded && <div ref={mapRef} id="mapa-acoes-publico" className={styles.publicMap}>
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

      <section className={styles.videoSection} aria-labelledby="video-title">
        <div className={styles.videoFrame}>
          <iframe
            src="https://www.youtube-nocookie.com/embed/8rco9x7wIck"
            title="MobilizAÇÃO | ONG Moradia e Cidadania"
            loading="lazy"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        </div>
        <div className={styles.volunteerCounter}>
          <img className={`${styles.counterElement} ${styles.counterLeaves}`} src={leavesElement} alt="" aria-hidden="true" />
          <img className={`${styles.counterElement} ${styles.counterSprout}`} src={sproutElement} alt="" aria-hidden="true" />
          <div className={styles.volunteerCounterContent}>
            <h2 id="video-title"><span className={styles.counterTitleMain}>Juntos semeamos</span><span>um futuro melhor</span></h2>
            <p>Já somos</p>
            <VolunteerCounter />
            <small>voluntários</small>
          </div>
        </div>
      </section>

      <section className={styles.whoWeAre} aria-labelledby="who-we-are-title">
        <div className={styles.whoWeAreCopy}>
          <p className={styles.eyebrow}>MobilizAÇÃO</p>
          <h2 id="who-we-are-title">Quem somos</h2>
          <p>Somos um movimento liderado pela ONG Moradia e Cidadania, criada por <strong>empregados e aposentados da CAIXA</strong> há 26 anos e que conecta pessoas, organizações e ideias para <strong>transformar realidades</strong> e construir um <strong>futuro mais justo, solidário e sustentável</strong> para todos.</p>
          <a className={styles.whoWeAreButton} href="https://moradiaecidadania.org.br" target="_blank" rel="noreferrer">Saiba mais sobre a ONG</a>
        </div>
        <img src={whoWeAreImage} alt="Voluntários da ONG Moradia e Cidadania" />
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
            <span className={styles.previousMetric}><b>1.417</b> voluntários mobilizados</span>
          </span>
          <span className={styles.previousLink}>Ver relatório da edição 2025 <b aria-hidden="true">→</b></span>
        </Link>
      </section>

      <section id="agenda-2030" className={styles.activeCampaign} aria-labelledby="active-campaign-title">
        <div className={styles.associationPhoto}>
          <img src={associatesGroupPhoto} alt="Grupo de pessoas voluntárias da ONG Moradia e Cidadania" />
          <span>Colabore o ano todo!</span>
        </div>
        <div className={styles.associationImpact}>
          <img src={sproutElement} alt="" aria-hidden="true" />
          <p>Uma nova pessoa,<br />uma nova árvore.</p>
          <strong>Um futuro em crescimento.</strong>
          <AssociatesCounter />
        </div>
        <div className={styles.associationCommitment}>
          <img src={leavesElement} alt="" aria-hidden="true" />
          <p className={styles.eyebrow}>Compromisso</p>
          <h2 id="active-campaign-title">Para cada <b>novo associado</b>, de setembro a dezembro de 2026, plantaremos <b>1 árvore</b>.</h2>
          <p>Seja associado da <b>Moradia e Cidadania</b> e contribua mensalmente para os mais de 200 projetos que apoiamos em todo o Brasil.</p>
          <a href="https://moradiaecidadania.org.br" target="_blank" rel="noreferrer">Seja associado</a>
        </div>
      </section>
      <PublicCoordinatorAccess />
    </main>
  );
}
