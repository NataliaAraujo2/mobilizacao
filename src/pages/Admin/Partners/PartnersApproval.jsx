import { useState, useEffect } from "react";
import Card from "../../../components/ui/Card";
import Button from "../../../components/ui/Button";
import EntityDetails from "../../../components/EntityDetails";
import RejectModal from "../../../components/RejectModal";
import FilterBar from "../../../components/ui/FilterBar";
import styles from "../../../styles/Dashboard.module.css";
import { usePartnerApproval } from "../../../hooks/usePartnerApproval";
import { useNavigate } from "react-router-dom";

export default function PartnersApproval() {
  const [selected, setSelected] = useState(null);
  const [rejecting, setRejecting] = useState(null); // { id, type }
  const [filteredPartners, setFilteredPartners] = useState([]);

  const {
    partners,
    loading,
    approveCadastro,
    rejectCadastro,
    approveLogo,
    rejectLogo,
  } = usePartnerApproval();

  const navigate = useNavigate();

  // sempre que "partners" mudar, atualiza a lista filtrada
  useEffect(() => {
    setFilteredPartners(partners);
  }, [partners]);

  if (loading) return <p>Carregando parceiros...</p>;

  return (
    <div className={styles.container}>
      <div className={styles.title}>
        <h2 >Aprovação de Parceiros</h2>
        <Button variant="secondary" onClick={() => navigate("/dashboard")}>
          Ir para Dashboard
        </Button>
      </div>
      <FilterBar
        data={partners}
        filters={[
          {
            key: "statusCadastro",
            label: "Cadastro",
            options: [
              { value: "pending", label: "Pendentes" },
              {
                value: "rejected_pending",
                label: "Rejeitados (com pendência)",
              },
              { value: "rejected", label: "Rejeitados (definitivo)" },
            ],
          },
        ]}
        onFilter={(filtered) => setFilteredPartners(filtered)}
      />
      {filteredPartners.length === 0 && (
        <p>Não há parceiros pendentes de aprovação.</p>
      )}
      <div className={styles.grid}>
        {filteredPartners.map((partner) => (
          <Card key={partner.id} title={partner.name}>
            <p>
              <strong>Email:</strong> {partner.email}
            </p>
            <p>
              <strong>Estado:</strong> {partner.estado}
            </p>
            {partner.municipio && (
              <p>
                <strong>Município:</strong> {partner.municipio}
              </p>
            )}
            <div className={styles.actions}>
              <Button onClick={() => setSelected(partner)}>Visualizar</Button>
            </div>
          </Card>
        ))}
      </div>

      {selected && (
        <EntityDetails
          title="Detalhes do Parceiro"
          entity={selected}
          fields={[
            { label: "Nome", key: "name" },
            { label: "Email", key: "email" },
            { label: "Website", key: "website" },
            { label: "Descrição", key: "description" },
            { label: "Estado", key: "estado" },
            { label: "Município", key: "municipio" },
            { label: "Status do Cadastro", key: "statusCadastro" },
            { label: "Status do Logo", key: "statusLogo" },
            { label: "Motivo da Rejeição", key: "rejectionReason" },
          ]}
          onClose={() => setSelected(null)}
          extraActions={(entity) => (
            <>
              {entity.statusCadastro === "pending" || entity.statusCadastro === "rejected_pending"  && (
                <>
                  <Button onClick={() => approveCadastro(entity.id)}>
                    Aprovar Cadastro
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() =>
                      setRejecting({ id: entity.id, type: "cadastro" })
                    }
                  >
                    Rejeitar Cadastro
                  </Button>
                </>
              )}
            </>
          )}
          logoActions={(entity) =>
            entity.statusLogo === "pending" && (
              <>
                <Button onClick={() => approveLogo(entity.id)}>
                  Aprovar Logo
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => setRejecting({ id: entity.id, type: "logo" })}
                >
                  Rejeitar Logo
                </Button>
              </>
            )
          }
        />
      )}

      {rejecting && (
        <RejectModal
          onClose={() => setRejecting(null)}
          onConfirm={(reason, pendente) => {
            if (rejecting.type === "cadastro") {
              rejectCadastro(rejecting.id, reason, pendente);
            } else {
              rejectLogo(rejecting.id, reason, pendente);
            }
            setRejecting(null);
          }}
        />
      )}
    </div>
  );
}
