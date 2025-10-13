// src/pages/dashboard/volunteers/VolunteersDashboard.jsx
import { useNavigate } from "react-router-dom";
import Card from "../../../components/ui/Card";
import Button from "../../../components/ui/Button";
import styles from "../../../styles/Dashboard.module.css";

export default function VolunteersDashboard() {
  const navigate = useNavigate();

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>Gestão de Voluntários</h2>
      <div className={styles.grid}>
        <Card title="Aprovar Voluntários">
          <p>Valide registros de voluntários em todo o Brasil.</p>
          <Button onClick={() => navigate("/dashboard/voluntarios/aprovacao")}>
            Aprovar
          </Button>
        </Card>

        <Card title="Ver Detalhes">
          <p>Consulte detalhes de voluntários cadastrados.</p>
          <Button onClick={() => navigate("/dashboard/voluntarios/lista")}>
            Ver Lista
          </Button>
        </Card>
      </div>
    </div>
  );
}
