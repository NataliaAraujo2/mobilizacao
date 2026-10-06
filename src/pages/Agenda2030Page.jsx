import agendaCubes from "../assets/brand/agenda-ods-cubos-recorte.png";
import plantComposition from "../assets/brand/agenda-ramo-mundo-inclusao.png";
import cnodsLogo from "../assets/brand/cnods-conferencia-branco.png";
import agendaElement from "../assets/brand/elements/elemento-03.webp";
import styles from "./Agenda2030Page.module.css";

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
            <img src={plantComposition} alt="Ramo verde com fotos de participantes das ações, crescendo sobre o planeta Terra" />
            <p className={styles.plantStatement}>Somamos forças com a Comissão Nacional para os Objetivos de Desenvolvimento Sustentável para mobilização da 1ª Conferência Nacional ODS, levando o voluntariado para as políticas públicas e para a Agenda 2030.</p>
          </div>
          <div className={styles.cnodsCopy}>
            <a href="https://www.conferenciaods.org/" target="_blank" rel="noreferrer">Conheça a Conferência Nacional ODS <span aria-hidden="true">→</span></a>
            <img className={styles.cnodsLogo} src={cnodsLogo} alt="1ª Conferência Nacional dos Objetivos de Desenvolvimento Sustentável" />
          </div>
        </div>
      </section>
    </main>
  );
}
