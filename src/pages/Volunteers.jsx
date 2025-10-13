import { Link } from "react-router-dom";
import styles from "../styles/Volunteers.module.css";
import Banner from "../components/ui/Banner";
import Button from "../components/ui/Button";
import { FaMapMarkerAlt, FaUserPlus, FaHandsHelping, FaShareAlt } from "react-icons/fa";
import volunteers from "../assets/partners-banner.png"

export default function Volunteers() {
  return (
    <div className={styles.volunteersPage}>
      {/* 🔹 Banner principal */}
      <Banner
        image={volunteers}
        title="Seja um voluntário!"
        buttonText="Quero participar"
        buttonLink="/voluntarios/cadastro"
        imagePosition="center" // controla o foco da imagem
        ariaLabel="Voluntários em ação, ajudando a comunidade"
      />

      {/* 🔹 Conteúdo principal */}
      <section className={styles.content}>
        <p>
          O coração da <strong>MobilizAção</strong> são os nossos{" "}
          <strong>voluntários</strong>. Pessoas comuns, de diferentes lugares e
          histórias, que oferecem seu tempo, talento e energia para transformar
          vidas. Cada voluntário é um elo essencial em nossa rede de
          solidariedade, multiplicando esperança e construindo um futuro mais
          justo.
        </p>
        <p>
          Se você também acredita que pequenas ações podem gerar grandes
          mudanças, venha fazer parte dessa corrente do bem.
        </p>

        <div className={styles.cta}>
          <Link to="/voluntarios/cadastro">
            <Button variant="secondary">Quero ser voluntário</Button>
          </Link>
        </div>
      </section>

      {/* 🔹 Como Participar */}
      <section className={styles.steps}>
        <h2>Como Participar</h2>
        <div className={styles.stepsGrid}>
          <div className={styles.step}>
            <FaMapMarkerAlt className={styles.icon} />
            <p>Escolha sua coordenação/local.</p>
          </div>
          <div className={styles.step}>
            <FaUserPlus className={styles.icon} />
            <p>Inscreva-se como voluntário.</p>
          </div>
          <div className={styles.step}>
            <FaHandsHelping className={styles.icon} />
            <p>Participe das ações.</p>
          </div>
          <div className={styles.step}>
            <FaShareAlt className={styles.icon} />
            <p>Compartilhe nas redes com a hashtag oficial.</p>
          </div>
        </div>
      </section>

      {/* 🔹 Projetos Locais */}
      <section className={styles.projects}>
        <h2>Projetos Locais</h2>
        <p>Encontre iniciativas perto de você no mapa interativo:</p>
        <div className={styles.mapWrapper}>
          {/* Aqui você pode integrar o BrasilMap futuramente */}
          <div className={styles.mapPlaceholder}>
            [Mapa do Brasil Interativo]
          </div>
        </div>
      </section>
    </div>
  );
}
