// src/pages/Admin/Dashboard/Partners/PartnersApproval.jsx
import { useState } from "react";
import Card from "../../../components/ui/Card";
import Button from "../../../components/ui/Button";
import EntityDetails from "../../../components/EntityDetails";
import styles from "../../../styles/Dashboard.module.css";
import { useVolunteerApproval } from "../../../hooks/useVolunteerApproval";

export default function VolunteersApproval() {
  const [selected, setSelected] = useState(null);
  const { volunteers, loading, approveVolunteer, rejectVolunteer } = useVolunteerApproval();

  if (loading) return <p>Carregando parceiros...</p>;
  if (volunteers.length === 0) return <p>Não há voluntários pendentes.</p>;

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>Aprovação de Parceiros</h2>
      <div className={styles.grid}>
        {volunteers.map((volunteer) => (
          <Card key={volunteer.id} title={volunteer.name}>
            <p>
              <strong>Email:</strong> {volunteer.email}
            </p>
            <p>
              <strong>Estado:</strong> {volunteer.estado}
            </p>
            {volunteer.municipio && (
              <p>
                <strong>Município:</strong> {volunteer.municipio}
              </p>
            )}
            <div className={styles.actions}>
              <Button onClick={() => setSelected(volunteer)}>Visualizar</Button>
            </div>
          </Card>
        ))}
      </div>

      {selected && (
        <EntityDetails
          title="Detalhes do Voluntário"
          entity={selected}
          fields={[
            { label: "Nome", key: "name" },
            { label: "Email", key: "email" },
            { label: "Website", key: "website" },
            { label: "Descrição", key: "description" },
            { label: "Estado", key: "estado" },
            { label: "Município", key: "municipio" },
            { label: "Status", key: "statusCadastro" },
          ]}
          onClose={() => setSelected(null)}
          onApprove={approveVolunteer}
          onReject={rejectVolunteer}
          canApprove={true} // 🔹 ou você pode trazer isso do hook se quiser validar permissões
        />
      )}
    </div>
  );
}
