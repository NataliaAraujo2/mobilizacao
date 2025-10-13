// src/pages/dashboard/coordinators/CoordinatorsDashboard.jsx
import { useNavigate } from "react-router-dom";
import Card from "../../../components/ui/Card";
import Button from "../../../components/ui/Button";
import styles from "../../../styles/Dashboard.module.css";
import Header from "../../../components/Header";

export default function CoordinatorsDashboard() {
  const navigate = useNavigate();

  return (
    <div className={styles.container}>
      <Header />
      <Button onClick={()=> navigate("/dashboard")}>Ir para Dashboard</Button>
      <h2 className={styles.title}>Gestão de Coordenações</h2>
      <div className={styles.grid}>
        <Card title="Aprovar Coordenações">
          <p>Valide novos coordenadores estaduais e municipais.</p>
          <Button onClick={() => navigate("/dashboard/coordenacoes/aprovacao")}>
            Aprovar
          </Button>
        </Card>

        <Card title="Gerenciar Estaduais">
          <p>Controle coordenações estaduais.</p>
          <Button onClick={() => navigate("/dashboard/coordenacoes/estaduais")}>
            Ver Estaduais
          </Button>
        </Card>


      </div>
    </div>
  );
}
