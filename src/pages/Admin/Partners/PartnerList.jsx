// src/pages/Admin/Partners/PartnerList.jsx
import { Link, useNavigate } from "react-router-dom";
import { usePartners } from "../../../hooks/usePartners";
import styles from "../../../styles/List.module.css";
import Button from "../../../components/ui/Button";

export default function PartnerList() {
  const { partners, loading } = usePartners();
  const navigate = useNavigate()

  if (loading) {
    return <p>Carregando parceiros...</p>;
  }

  if (!partners.length) {
    return <p>Nenhum parceiro cadastrado.</p>;
  }

  return (
    <section className={styles.container}>
      <div className={styles.title}>
        <h2>Parceiros</h2>
        <Link to="/dashboard/parceiros/create" className={styles.addButton}>
          + Adicionar Parceiro
        </Link>
        <Button variant="secondary" onClick={() => navigate(-1)}>
          Voltar
        </Button>
      </div>

      <ul className={styles.list}>
        {partners.map((partner) => (
          <li key={partner.id} className={styles.listItem}>
            <Link to={`/dashboard/parceiros/edit/${partner.id}`}>
              {partner.name || "Nome não informado"}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
