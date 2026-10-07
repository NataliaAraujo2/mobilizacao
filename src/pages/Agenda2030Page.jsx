import { Link } from "react-router-dom";
import agendaCubes from "../assets/brand/agenda-ods-cubos-recorte.png";
import guinhoOds from "../assets/brand/guinhos/2_GUINHO_ODS.png";
import plantComposition from "../assets/brand/agenda-ramo-mundo-inclusao.png";
import originalCleanup from '../assets/brand/agenda-ods-limpeza.webp';
import originalPlanting from '../assets/brand/agenda-ods-plantio.webp';
import cnodsLogo from "../assets/brand/cnods-conferencia-branco.png";
import agendaElement from "../assets/brand/elements/elemento-03.webp";
import styles from "./Agenda2030Page.module.css";

const odsImages = import.meta.glob("../assets/brand/ods/ods-*.{svg,png}", { eager: true, query: "?url", import: "default" });
const odsTitles = [
  "Erradicação da Pobreza", "Fome Zero e Agricultura Sustentável", "Saúde e Bem-Estar",
  "Educação de Qualidade", "Igualdade de Gênero", "Água Potável e Saneamento",
  "Energia Limpa e Acessível", "Trabalho Decente e Crescimento Econômico",
  "Indústria, Inovação e Infraestrutura", "Redução das Desigualdades",
  "Cidades e Comunidades Sustentáveis", "Consumo e Produção Responsáveis",
  "Ação Contra a Mudança Global do Clima", "Vida na Água", "Vida Terrestre",
  "Paz, Justiça e Instituições Eficazes", "Parcerias e Meios de Implementação",
  "Igualdade Étnico-Racial",
];

export default function Agenda2030Page() {
  return (
    <main className={styles.page}>
      <section className={styles.hero} aria-labelledby="agenda-title">
        <header className={styles.heroTitle}>
          <span className={styles.agendaMark} aria-hidden="true"><i /><img src={agendaElement} alt="" /></span>
          <h1 id="agenda-title">Agenda 2030 <b>+ ODS</b></h1>
        </header>
        <div className={styles.introPanel}>
          <div className={styles.introCopy}>
            <p>
              A MobilizAÇÃO está alinhada aos{" "}
              <a
                href="https://brasil.un.org/pt-br/91863-agenda-2030-para-o-desenvolvimento-sustent%C3%A1vel"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "#f58220", fontWeight: 850, textDecoration: "none", textDecorationThickness: "0.07em", textUnderlineOffset: "0.14em" }}
                onMouseEnter={(event) => { event.currentTarget.style.textDecorationLine = "underline"; }}
                onMouseLeave={(event) => { if (event.currentTarget !== document.activeElement) event.currentTarget.style.textDecorationLine = "none"; }}
                onFocus={(event) => { event.currentTarget.style.textDecorationLine = "underline"; }}
                onBlur={(event) => { event.currentTarget.style.textDecorationLine = "none"; }}
              >
                Objetivos de Desenvolvimento Sustentável da ONU
              </a>
              , contribuindo para a construção de um mundo mais{" "}
              <strong style={{ color: "#14743d", fontWeight: 850, background: "linear-gradient(transparent 60%, #dff2e4 60%)", boxDecorationBreak: "clone", WebkitBoxDecorationBreak: "clone" }}>
                justo, inclusivo e sustentável.
              </strong>
            </p>
          </div>
          <div className={styles.cubesFrame}>
            <img src={agendaCubes} alt="Voluntária da Moradia e Cidadania com cubos dos Objetivos de Desenvolvimento Sustentável" />
          </div>
        </div>
        <div className={styles.cnodsPanel}>
          <div className={styles.cnodsHeading}>
            <h2>A Moradia e Cidadania integra a <b>CNODS</b></h2>
          </div>
          <div className={styles.plantScene}>
            <svg className={styles.plantArtwork} viewBox="0 0 1895 830" role="img" aria-label="Ramo verde com fotos originais de participantes das ações, crescendo sobre o planeta Terra">
              <defs>
                <clipPath id="agenda-cleanup-photo"><ellipse cx="923" cy="195" rx="153" ry="153" /></clipPath>
                <clipPath id="agenda-planting-photo"><ellipse cx="1369" cy="294" rx="154" ry="153" /></clipPath>
              </defs>
              <image href={plantComposition} width="1895" height="830" />
              <image href={originalCleanup} x="770" y="42" width="306" height="306" preserveAspectRatio="xMidYMid slice" clipPath="url(#agenda-cleanup-photo)" />
              <image href={originalPlanting} x="1215" y="141" width="308" height="306" preserveAspectRatio="xMidYMin slice" clipPath="url(#agenda-planting-photo)" />
            </svg>
            <p className={styles.plantStatement}>Somamos forças com a Comissão Nacional para os Objetivos de Desenvolvimento Sustentável para mobilização da 1ª Conferência Nacional ODS, levando o voluntariado para as políticas públicas e para a Agenda 2030.</p>
          </div>
          <div className={styles.cnodsCopy}>
            <a href="https://www.conferenciaods.org/" target="_blank" rel="noreferrer">Conheça a Conferência Nacional ODS <span aria-hidden="true">→</span></a>
            <img className={styles.cnodsLogo} src={cnodsLogo} alt="1ª Conferência Nacional dos Objetivos de Desenvolvimento Sustentável" />
          </div>
        </div>
      </section>
      <section className={styles.impactCard} aria-labelledby="impact-title">
        <div className={styles.impactCopy}>
          <h2 id="impact-title">Um movimento<br />que gera <span>IMPACTO</span></h2>
          <p>Em 2025, a MobilizAÇÃO uniu voluntários de todo o Brasil em ações que contribuíram para o avanço dos Objetivos de Desenvolvimento Sustentável (ODS) e para a transformação de comunidades.</p>
        </div>
        <div className={styles.impactResults}>
          <h3>Quer saber o que construímos juntos?</h3>
          <p>Conheça os resultados da Mobiliz<span>AÇÃO</span> 2025</p>
          <img src={guinhoOds} alt="Guinho com o círculo colorido dos Objetivos de Desenvolvimento Sustentável" />
          <Link className={styles.editionButton} to="/2025">
            <img src={agendaElement} alt="" aria-hidden="true" />
            EDIÇÃO 2025
          </Link>
        </div>
      </section>
      <section className={styles.odsCard} aria-labelledby="ods-title">
        <h2 id="ods-title">Clique nos ícones e conheça as <span>METAS</span> para cada Objetivo:</h2>
        <div className={styles.odsGrid}>
          {odsTitles.map((title, index) => {
            const number = index + 1;
            const file = `../assets/brand/ods/ods-${String(number).padStart(2, "0")}.${number === 18 ? "png" : "svg"}`;
            return (
              <a key={number}
                href={number === 18 ? "https://brasil.un.org/pt-br/314206-ods-18-gloss%C3%A1rio-de-termos" : `https://brasil.un.org/pt-br/sdgs/${number}`}
                target="_blank" rel="noopener noreferrer"
                aria-label={`Conheça as metas do ODS ${number}: ${title} (abre em nova aba)`}>
                <img src={odsImages[file]} alt={`ODS ${number} — ${title}`} width="200" height="200" loading="lazy" />
              </a>
            );
          })}
        </div>
      </section>
    </main>
  );
}
