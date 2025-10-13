import Card from "../../../components/ui/Card";
import styles from "../../../styles/Dashboard.module.css";

export default function PartnerDashboard() {
  return (
    <div className={styles.container}>
      <h2 className={styles.title}>Área do Parceiro</h2>
      <div className={styles.grid}>
        <Card title="Minha Situação">
          <p>Seu cadastro está em análise. Aguarde aprovação da coordenação.</p>
        </Card>
        <Card title="Dados do Parceiro">
          <p>Edite suas informações cadastrais e acompanhe atualizações.</p>
        </Card>
      </div>
    </div>
  );
}
