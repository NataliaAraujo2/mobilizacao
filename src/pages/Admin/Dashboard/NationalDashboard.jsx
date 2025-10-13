// src/pages/dashboard/NationalDashboard.jsx
import { useNavigate } from "react-router-dom";
import Card from "../../../components/ui/Card";
import Button from "../../../components/ui/Button";
import styles from "../../../styles/Dashboard.module.css";
import Header from "../../../components/Header";

export default function NationalDashboard() {
  const navigate = useNavigate();

  return (
    <div className={styles.container}>
      <Header />
      <h2 className={styles.title}>Coordenação Nacional</h2>
      <div className={styles.grid}>
        <Card title="Gerenciar Estados">
          <p>Controle coordenações estaduais e municipais.</p>
          <Button onClick={() => navigate("/dashboard/estados")}>
            Ver Estados
          </Button>
        </Card>

        
        <Card title="ações">
          <p>Gerencie cadastros, aprovações e edições de ações.</p>
          <Button onClick={() => navigate("/dashboard/ações/estaduais")}>
            Acessar Projetos
          </Button>
        </Card>

        <Card title="Parceiros">
          <p>Gerencie cadastros, aprovações e edições de parceiros.</p>
          <Button onClick={() => navigate("/dashboard/parceiros")}>
            Acessar Parceiros
          </Button>
        </Card>

        <Card title="Voluntários">
          <p>Acompanhe registros e aprovações de voluntários.</p>
          <Button onClick={() => navigate("/dashboard/voluntarios")}>
            Acessar Voluntários
          </Button>
        </Card>

        <Card title="Coordenações">
          <p>Gerencie e valide coordenações estaduais e municipais.</p>
          <Button onClick={() => navigate("/dashboard/coordenacoes")}>
            Acessar Coordenações
          </Button>
        </Card>
      </div>
    </div>
  );
}
