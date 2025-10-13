// src/pages/dashboard/partners/PartnersDashboard.jsx
import { useNavigate } from "react-router-dom";
import Card from "../../../components/ui/Card";
import Button from "../../../components/ui/Button";
import styles from "../../../styles/Dashboard.module.css";

export default function PartnersDashboard() {
  const navigate = useNavigate();

  return (
    <div className={styles.container}>
      <div className={styles.title}>
        <h2>Aprovação de Parceiros</h2>
        <Button variant="secondary" onClick={() => navigate(-1)}>
          Voltar
        </Button>
      </div>
      <div className={styles.grid}>
        <Card title="Cadastrar Parceiro">
          <p>Inclua um novo parceiro na plataforma.</p>
          <Button onClick={() => navigate("/dashboard/parceiros/create")}>
            Cadastrar
          </Button>
        </Card>

        <Card title="Aprovar Parceiros">
          <p>Valide cadastros pendentes de parceiros.</p>
          <Button onClick={() => navigate("/dashboard/parceiros/aprovacao")}>
            Aprovar
          </Button>
        </Card>

        <Card title="Editar Parceiros">
          <p>Edite informações de parceiros já cadastrados.</p>
          <Button onClick={() => navigate("/dashboard/parceiros/list")}>
            Editar
          </Button>
        </Card>
      </div>
    </div>
  );
}
