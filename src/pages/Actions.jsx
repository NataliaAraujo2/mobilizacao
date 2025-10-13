import React from "react";
import styles from "../styles/Actions.module.css";
import { useNavigate } from "react-router-dom";

import fomeImg from "../assets/combate_a_fome_e_a_miseria.png";
import educacaoImg from "../assets/educacao.png";
import trabalhoImg from "../assets/combate_a_fome_e_a_miseria.png";
import meioAmbienteImg from "../assets//educacao.png";

export default function Actions() {
  const navigate = useNavigate();

  const projetos = [
    {
      title: "Combate à fome e à miséria",
      desc: "Apoie ações de arrecadação e distribuição de alimentos, ajudando famílias em situação de vulnerabilidade.",
      image: fomeImg,
      link: "/projetos/fome",
    },
    {
      title: "Educação",
      desc: "Transforme vidas por meio do acesso ao conhecimento, reforço escolar e inclusão digital.",
      image: educacaoImg,
      link: "/projetos/educacao",
    },
    {
      title: "Geração de trabalho e renda",
      desc: "Participe de iniciativas que incentivam o empreendedorismo e capacitação profissional.",
      image: trabalhoImg,
      link: "/projetos/trabalho",
    },
    {
      title: "Proteção ao meio ambiente",
      desc: "Engaje-se em projetos de preservação, reflorestamento e conscientização ecológica.",
      image: meioAmbienteImg,
      link: "/projetos/meio-ambiente",
    },
  ];

  return (
    <div className={styles.page}>
      {/* Hero */}
      <section className={styles.hero}>
        <p className={styles.p}>
          Em 2025, no Dia Internacional do Voluntário (05 de dezembro), propomos
          uma Mobilização Nacional para o Voluntariado, unindo empregados e
          aposentados da CAIXA, suas famílias, parceiros institucionais e a
          sociedade civil em um movimento de impacto coletivo em todo o País.
        </p>
        <p className={styles.pAlt}>
          Unidos fazemos a diferença — venha conhecer e fortalecer nossos
          projetos.
        </p>
      </section>

      {/* Projetos */}
      <section className={styles.projetos}>
        {projetos.map((proj, i) => (
          <div key={i} className={styles.card}>
            <div
              className={styles.cardImage}
              style={{ backgroundImage: `url(${proj.image})` }}
            />
            <div className={styles.cardContent}>
              <h2>{proj.title}</h2>
              <p>{proj.desc}</p>
              <button onClick={() => navigate(proj.link)}>Saiba mais</button>
            </div>
          </div>
        ))}
      </section>

      {/* Chamada Final */}
      <section className={styles.finalCTA}>
        <h2>O futuro depende do que fazemos hoje</h2>
        <p>
          Seja um agente de transformação. Doe seu tempo, suas habilidades e sua
          energia.
        </p>
        <button className={styles.cta} onClick={() => navigate("/cadastro")}>
          Cadastre-se como voluntário
        </button>
      </section>
    </div>
  );
}
