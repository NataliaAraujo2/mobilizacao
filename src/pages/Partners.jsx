import { Link } from "react-router-dom";
import styles from "../styles/Partners.module.css";
import Banner from "../components/ui/Banner";
import Button from "../components/ui/Button";
import { usePartners } from "../hooks/usePartners";
import partnersBanner from "../assets/partners-banner.png";

export default function Partners() {
  const { partners, loading } = usePartners(); // público

  return (
    <div className={styles.partnersPage}>
      <Banner
        image={partnersBanner}
        title="Nossas Instituições Parceiras"
        subtitle="Juntos, potencializamos o impacto do voluntariado."
      />

      <section className={styles.content}>
        <p>
          A força da <strong>MobilizAção</strong> vem da colaboração. Cada
          parceiro traz seu talento, recurso e dedicação para transformar
          comunidades em todo o Brasil.
        </p>

        <div className={styles.cta}>
          <Link to="/parceiros/cadastro">
            <Button variant="secondary">Quero ser parceiro</Button>
          </Link>
        </div>

        {loading ? (
          <p>Carregando parceiros...</p>
        ) : (
          <div className={styles.partnersGrid}>
            {partners
              .filter(
                (partner) =>
                  partner.statusCadastro === "approved" &&
                  partner.statusLogo === "approved"
              )
              .map((partner) => (
                <div key={partner.id} className={styles.partnerCard}>
                  {partner.logoPath && (
                    <img
                      src={`/partners/${partner.logoPath}`}
                      alt={`Logo ${partner.name}`}
                      className={styles.partnerLogo}
                    />
                  )}
                  <h3>{partner.name}</h3>
                  {partner.description && <p>{partner.description}</p>}
                  {partner.website && (
                    <a
                      href={partner.website}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Visitar site
                    </a>
                  )}
                </div>
              ))}
          </div>
        )}
      </section>
    </div>
  );
}
