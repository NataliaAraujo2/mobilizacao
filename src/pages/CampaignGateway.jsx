import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import BrazilMap from "../components/BrazilMap/BrazilMap";
import PublicActionsPanel from "../components/PublicActionsPanel";
import { BRAZIL_STATE_BY_CODE } from "../domain/locations/brazilStates";
import logo2025 from "../assets/brand/mobilizacao-logo-2025.webp";
import associatesBanner from "../assets/brand/campanha-associados-2026.webp";
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

export default function CampaignGateway() {
  const [selectedState, setSelectedState] = useState("");
  const [heroExpanded, setHeroExpanded] = useState(false);
  const { user, claims } = useAuth();

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
        {heroExpanded && <div id="mapa-acoes-publico" className={styles.publicMap}>
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
        <div className={styles.videoCopy}>
          <p className={styles.eyebrow}>Conheça a MobilizAÇÃO</p>
          <h2 id="video-title">Assista e venha fazer parte</h2>
          <p>Conheça um pouco mais sobre a MobilizAÇÃO e como sua participação ajuda a transformar comunidades.</p>
        </div>
        <div className={styles.videoFrame}>
          <iframe
            src="https://www.youtube-nocookie.com/embed/8rco9x7wIck"
            title="MobilizAÇÃO | ONG Moradia e Cidadania"
            loading="lazy"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        </div>
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
