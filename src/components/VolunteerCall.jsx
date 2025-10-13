import React from "react";
import styles from "../styles/VolunteerCall.module.css";
import Card from "./ui/Card";
import Button from "./ui/Button";

export default function VolunteerCall() {
  return (
    <Card>
      <section
        className={styles.callVolunteer}
        role="region"
        aria-labelledby="call-title"
      >
        <h2 id="call-title" className={styles.callVolunteerH2}>
          EM BREVE!
        </h2>
        <h2 className={styles.callVolunteerH2}>Dia 03 de novembro de 2025</h2>

        <p className={styles.callVolunteerP}>
          Vamos apresentar os{" "}
          <strong>projetos da Campanha Nacional de Mobilização</strong>.
          <br />
          <strong>A partir desse dia, você pode ser voluntário!</strong>
        </p>

        <div className={styles.actions} aria-hidden="false">
          <ul
            className={styles.actionList}
            aria-label="Ações que você pode realizar"
          >
            <li>Participe.</li>
            <li>Doe seu tempo.</li>
            <li>Ajude quem precisa.</li>
          </ul>

          <div
            className={styles.cta}
            role="group"
            aria-label="Chamada para ação"
          >
            <Button
              variant="secondary"
              href="#voluntarios"
              aria-label="Inscreva-se como voluntário — vai para a seção de voluntários"
            >
              Seja voluntário — saiba como
            </Button>
          </div>
        </div>

        <p className={styles.footer}>
          <strong>Juntos, fazemos um Brasil mais solidário.</strong>{" "}
          <span aria-hidden="true">💚</span>
        </p>
      </section>
    </Card>
  );
}
