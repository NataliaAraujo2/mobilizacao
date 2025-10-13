import Banner from "../components/ui/Banner";
import styles from "../styles/About.module.css";
import mundo from "../assets/mundo.png"; // banner principal
import about1 from "../assets/about1.jpg"; // propósito da campanha
import ods from "../assets/ods.jpg"; // ODS
import cop from "../assets/cop.png"; // COP 30 / impacto global
import Mobilizacao from "./ui/Mobilizacao";

export default function About() {
  return (
    <main id="sobre" className={styles.about}>
      {/* Banner institucional reutilizável */}
      <Banner
        image={mundo}
        variante
        ariaLabel="Faixa institucional da MobilizAção Nacional de Voluntariado"
        height="250px"
        children={
          <div className={styles.bannerTitle}>
            <h1>Sobre a</h1>
            <h1>
              <Mobilizacao />
            </h1>
          </div>
        }
      />

      {/* Conteúdo textual */}
      <section className={styles.about}>
        <div>
          <p>
            🌎{" "}
            <strong>
              <Mobilizacao /> 2025
            </strong>{" "}
            é a{" "}
            <strong>
              Campanha Nacional de Mobilização para o Voluntariado
            </strong>
            , que neste ano tem como tema central o{" "}
            <strong>Meio Ambiente</strong>.
          </p>

          <p>
            O propósito é claro:{" "}
            <strong>incentivar ações de voluntariado</strong> que promovam a
            <strong> preservação ambiental</strong>, a
            <strong> valorização dos espaços públicos</strong> e a
            <strong> melhoria da qualidade de vida</strong> nas comunidades.
          </p>

          {/* Imagem propósito da campanha */}
          <img
            src={about1}
            alt="Voluntários em ação ambiental"
            className={styles.imageRight}
          />

          <p>
            💚 A campanha mobiliza pessoas em todo o país, inspirando uma rede
            de solidariedade e conscientização sobre a importância de cuidar do
            nosso planeta — fortalecendo o compromisso coletivo com um futuro
            mais <strong>sustentável</strong> e <strong>responsável</strong>.
          </p>

          <p>
            🌱 As ações estão alinhadas aos{" "}
            <strong>Objetivos de Desenvolvimento Sustentável (ODS)</strong> da
            <strong> Agenda 2030 da ONU</strong>.
          </p>

          {/* Imagem ODS */}
          <img src={ods} alt="Simbolos da ODS" className={styles.imageCenter} />

          <p>Este ano daremos destaque para:</p>

          <ul>
            <li>
              <strong>ODS 11:</strong> Cidades e Comunidades Sustentáveis
            </li>
            <li>
              <strong>ODS 13:</strong> Ação Contra a Mudança Global do Clima
            </li>
            <li>
              <strong>ODS 15:</strong> Vida Terrestre
            </li>
          </ul>
          <br />
          {/* Imagem COP 30 / impacto global */}
          <img
            src={cop}
            alt="Conferência do Clima COP 30"
            className={styles.imageLeft}
          />
          <p>
            🌍 Em um ano histórico para o Brasil, o país sediará a{" "}
            <strong>
              COP 30 – Conferência das Nações Unidas sobre Mudanças Climáticas
            </strong>
            , em <strong>novembro de 2025</strong>. É o momento ideal para
            reafirmar nosso compromisso com a sustentabilidade e conectar a
            atuação local das Coordenações Estaduais a uma agenda mundial de
            transformação.
          </p>

          <p>
            ✋ A{" "}
            <strong>
              <Mobilizacao /> 2025
            </strong>{" "}
            é um chamado à participação: cada gesto conta, cada ação transforma.
            Junte-se a nós nessa mobilização por um futuro mais{" "}
            <strong>verde</strong>, <strong>solidário</strong> e
            <strong> inspirador</strong>.
          </p>

          <h1 className={styles.highlightedTextAlt}>
            Porque transformar o mundo começa com uma ação.
          </h1>
          <h1 className={styles.highlightedTextAlt}> E essa ação começa com você.</h1>
        </div>
      </section>
    </main>
  );
}
