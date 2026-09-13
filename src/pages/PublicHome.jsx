import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import BrazilMap from "../components/BrazilMap/BrazilMap";
import { BRAZIL_STATE_BY_CODE } from "../domain/locations/brazilStates";
import logoMobilizacao from "../assets/brand/mobilizacao-logo-colorido.webp";
import leafElement from "../assets/brand/elements/elemento-02.webp";
import treeElement from "../assets/brand/elements/elemento-04.webp";
import styles from "../App.module.css";

export default function PublicHome() {
  const [selectedState, setSelectedState] = useState("");
  const [mapOpen, setMapOpen] = useState(false);
  const [mapPreview, setMapPreview] = useState(false);
  const { user, claims, loading } = useAuth();
  const dashboardPath = claims?.role === "volunteer" ? "/voluntario" : claims?.role === "branchViewer" ? "/consulta" : "/admin";
  const mapVisible = mapOpen || mapPreview;

  function handleMapBlur(event) {
    if (!event.currentTarget.contains(event.relatedTarget)) setMapPreview(false);
  }

  return (
    <main className={styles.page}>
      <section className={styles.content} aria-labelledby="page-title">
        <div className={styles.hero}>
          <img className={`${styles.brandDetail} ${styles.brandDetailLeaf}`} src={leafElement} alt="" aria-hidden="true" />
          <img className={`${styles.brandDetail} ${styles.brandDetailTree}`} src={treeElement} alt="" aria-hidden="true" />
          <p className={styles.eyebrow}>2ª edição</p>
          <h1 id="page-title" className={styles.srOnly}>MobilizAÇÃO</h1>
          <img
            className={styles.campaignLogo}
            src={logoMobilizacao}
            alt="MobilizAÇÃO — Semeando e Cultivando o Futuro"
            width="1400"
            height="1466"
            fetchPriority="high"
          />
          <p className={styles.intro}>Encontre ações, orientações e avisos em todo o Brasil.</p>
        </div>

        <section
          className={styles.mapExperience}
          aria-labelledby="map-title"
          onMouseEnter={() => setMapPreview(true)}
          onMouseLeave={() => setMapPreview(false)}
          onFocus={() => setMapPreview(true)}
          onBlur={handleMapBlur}
        >
          <button
            className={styles.mapLauncher}
            type="button"
            aria-expanded={mapVisible}
            aria-controls="interactive-map"
            onClick={() => setMapOpen((current) => !current)}
          >
            <span className={styles.mapLauncherIcon} aria-hidden="true">⌖</span>
            <span>
              <small>Explore por região</small>
              <strong>{mapOpen ? "Fechar mapa" : "Ver mapa de ações"}</strong>
            </span>
            <span className={styles.mapLauncherArrow} aria-hidden="true">{mapVisible ? "↑" : "↓"}</span>
          </button>

          {mapVisible && (
            <div id="interactive-map" className={styles.mapReveal}>
              <div className={styles.mapSection}>
                <p className={styles.eyebrow}>Mapa interativo</p>
                <h2 id="map-title">Escolha um estado</h2>
                <p>Toque ou clique no estado para ver as ações da região.</p>
                <p className={styles.mapHint}><span aria-hidden="true" /> Os marcadores laranja facilitam a seleção dos estados menores.</p>
              </div>
              <BrazilMap selectedState={selectedState} onSelectState={setSelectedState} />
              <p className={styles.result} aria-live="polite">
                {selectedState ? <>Estado selecionado: <strong>{BRAZIL_STATE_BY_CODE[selectedState]?.name} ({selectedState})</strong></> : "Nenhum estado selecionado."}
              </p>
            </div>
          )}
        </section>

        <nav className={styles.quickAccess} aria-label="Acessos rápidos">
          {!loading && !user && (
            <Link to="/login">
              <span>Área restrita</span>
              <strong>Entrar no sistema</strong>
              <small>Acesso para administradores e voluntários</small>
            </Link>
          )}

          {!loading && user && (
            <Link to={dashboardPath}>
              <span>Minha conta</span>
              <strong>Acessar meu painel</strong>
              <small>{claims?.role === "superAdmin" ? "Visão administrativa nacional" : claims?.role === "branchViewer" ? "Consulta da minha regional" : "Área do voluntário"}</small>
            </Link>
          )}

          {!loading && claims?.role === "superAdmin" && (
            <Link to="/admin/regionais">
              <span>Administração</span>
              <strong>Gerenciar regionais</strong>
              <small>Cadastrar, editar, ativar e inativar</small>
            </Link>
          )}

          {!loading && claims?.role === "superAdmin" && (
            <Link to="/admin/voluntarios">
              <span>Administração</span>
              <strong>Gerenciar voluntários</strong>
              <small>Cadastro e documentos protegidos</small>
            </Link>
          )}

          {!loading && claims?.role === "superAdmin" && (
            <Link to="/admin/acessos-consulta">
              <span>Administração</span>
              <strong>Administradores das regionais</strong>
              <small>Gerar o acesso compartilhado de cada regional</small>
            </Link>
          )}

          {import.meta.env.DEV && (
            <a href="http://127.0.0.1:4000" target="_blank" rel="noreferrer">
              <span>Desenvolvimento</span>
              <strong>Abrir emuladores</strong>
              <small>Usuários e dados fictícios locais</small>
            </a>
          )}
        </nav>

      </section>
    </main>
  );
}
