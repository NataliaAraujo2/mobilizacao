import { useNavigate } from "react-router-dom";
import styles from "../styles/Unauthorized.module.css";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";

export default function Unauthorized() {
  const navigate = useNavigate();

  return (
    <Card>
      <div className={styles.container}>
        <h2 className={styles.title}>Acesso Negado</h2>
        <p className={styles.message}>
          Você não tem permissão para acessar esta página.
        </p>
        <Button onClick={() => navigate("/login")}>Ir para o Login</Button>
      </div>
    </Card>
  );
}
